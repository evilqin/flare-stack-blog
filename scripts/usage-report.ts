/**
 * Prints Cloudflare account usage next to the free-tier limits, so the blog's
 * headroom is visible at a glance. Runs from the "Usage Report" workflow with
 * the repository's Cloudflare secrets.
 *
 * Required: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
 * Optional (extra sections): D1_DATABASE_ID, BUCKET_NAME, KV_NAMESPACE_ID,
 * WORKER_NAME. Locally, without a token, it skips with a hint.
 *
 * GraphQL datasets differ per account/API version, so several shapes are tried
 * until one is accepted; the first working shape is printed.
 */

const API = "https://api.cloudflare.com/client/v4";
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.log(
    "CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set - skipping usage report.",
  );
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function rest(path: string): Promise<unknown> {
  const response = await fetch(`${API}/accounts/${accountId}${path}`, {
    headers,
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

async function graphql(queryText: string, variables: Record<string, unknown>) {
  const response = await fetch(`${API}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: queryText, variables }),
  });
  return (await response.json()) as {
    data?: unknown;
    errors?: { message: string }[];
  };
}

function section(title: string) {
  console.log(`\n## ${title}`);
}

/** Tries a list of query shapes until one is accepted; prints the result. */
async function attempt(label: string, shapes: string[]) {
  const errors: string[] = [];
  for (const shape of shapes) {
    const response = await graphql(
      `query ($account: String!, $db: String!) {
        viewer { accounts(filter: { accountTag: $account }) { ${shape} } }
      }`,
      { account: accountId, db: process.env.D1_DATABASE_ID ?? "" },
    );
    if (!response.errors?.length) {
      const account = (
        response.data as {
          viewer?: { accounts?: Record<string, unknown>[] };
        }
      )?.viewer?.accounts?.[0];
      if (!account) {
        console.log(`${label}: (empty)`);
        return;
      }
      for (const [key, value] of Object.entries(account)) {
        console.log(
          `${label} [${key}]: ${JSON.stringify(value).slice(0, 1500)}`,
        );
      }
      return;
    }
    errors.push(response.errors.map((error) => error.message).join("; "));
  }
  console.log(`${label}: no shape worked - ${errors[errors.length - 1]}`);
}

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  .toISOString()
  .slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86_400_000)
  .toISOString()
  .slice(0, 10);
const monthStart = new Date();
monthStart.setUTCDate(1);
const monthStartIso = monthStart.toISOString().slice(0, 10);

async function workers() {
  if (!process.env.WORKER_NAME) return;
  section("Workers invocations, last 7 days (limit 100k/day)");
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86_400_000);
  const response = await graphql(
    `
      query ($account: String!, $script: String!, $from: Time!, $to: Time!) {
        viewer {
          accounts(filter: { accountTag: $account }) {
            workersInvocationsAdaptive(
              limit: 1000
              filter: {
                scriptName: $script
                datetime_geq: $from
                datetime_leq: $to
              }
            ) {
              sum {
                requests
                errors
              }
              quantiles {
                cpuTimeP50
                cpuTimeP99
              }
              dimensions {
                date
              }
            }
          }
        }
      }
    `,
    {
      account: accountId,
      script: process.env.WORKER_NAME,
      from: from.toISOString(),
      to: to.toISOString(),
    },
  );
  if (response.errors?.length) {
    console.log(
      `graphql error - ${response.errors.map((e) => e.message).join("; ")}`,
    );
    return;
  }
  type Row = {
    sum: { requests: number; errors: number };
    quantiles: { cpuTimeP50: number; cpuTimeP99: number };
    dimensions: { date: string };
  };
  const data = response.data as {
    viewer?: { accounts?: { workersInvocationsAdaptive?: Row[] }[] };
  };
  const rows = data.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  const sorted = [...rows].sort((a, b) =>
    a.dimensions.date.localeCompare(b.dimensions.date),
  );
  for (const row of sorted) {
    console.log(
      `${row.dimensions.date}: ${row.sum.requests.toLocaleString("en-US")} req, ${row.sum.errors} err, ` +
        `cpu p50 ${(row.quantiles.cpuTimeP50 / 1000).toFixed(1)} ms / p99 ${(row.quantiles.cpuTimeP99 / 1000).toFixed(1)} ms`,
    );
  }
  const total = rows.reduce((sum, row) => sum + row.sum.requests, 0);
  console.log(`7d total: ${total.toLocaleString("en-US")} requests`);
}

async function d1() {
  section("D1 database (limit 500 MB/db, 5 GB/account)");
  if (process.env.D1_DATABASE_ID) {
    const body = (await rest(`/d1/database/${process.env.D1_DATABASE_ID}`)) as {
      result?: Record<string, unknown>;
    };
    for (const [key, value] of Object.entries(body.result ?? {})) {
      if (
        typeof value === "number" &&
        /size|byte|rows|table|read|write/i.test(key)
      ) {
        console.log(`${key}: ${value}`);
      }
    }
  }
  await attempt("rows", [
    `d1AnalyticsAdaptiveGroups(limit: 100, filter: { databaseId: $db, date_geq: "${weekAgo}" }) { sum { rowsRead rowsWritten readQueries writeQueries } dimensions { date } }`,
    `d1AnalyticsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}" }) { sum { rowsRead rowsWritten } dimensions { date } }`,
    `d1AnalyticsAdaptiveGroups(limit: 10) { sum { rowsRead rowsWritten } }`,
  ]);
}

async function r2() {
  if (!process.env.BUCKET_NAME) return;
  section("R2 bucket (limit 10 GB, 1M Class A + 10M Class B/month)");
  const body = (await rest(`/r2/buckets/${process.env.BUCKET_NAME}/usage`)) as {
    result?: Record<string, unknown>;
    errors?: { message: string }[];
  };
  if (body.result) {
    const result = body.result as Record<string, string>;
    console.log(
      `storage: ${(Number(result.payloadSize ?? 0) / 1024 / 1024).toFixed(2)} MiB payload, ` +
        `${result.objectCount} objects (uploads today: ${result.uploadCount})`,
    );
  } else if (body.errors?.length) {
    console.log(
      `usage endpoint: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }
  await attempt("storage", [
    `r2StorageAdaptiveGroups(limit: 1, filter: { bucketName: "${process.env.BUCKET_NAME}", date_geq: "${weekAgo}" }, orderBy: [date_DESC]) { max { objectCount payloadSize metadataSize } dimensions { date } }`,
  ]);
  await attempt("operations 30d", [
    `r2OperationsAdaptiveGroups(limit: 100, filter: { bucketName: "${process.env.BUCKET_NAME}", date_geq: "${monthAgo}", date_leq: "${today}" }) { sum { requests } dimensions { actionType } }`,
  ]);
}

async function kv() {
  if (!process.env.KV_NAMESPACE_ID) return;
  section("KV (limit 100k reads + 1k writes/day, 1 GB)");
  await attempt("operations 30d", [
    `kvOperationsAdaptiveGroups(limit: 100, filter: { namespaceId: "${process.env.KV_NAMESPACE_ID}", date_geq: "${monthAgo}", date_leq: "${today}" }) { sum { requests } dimensions { actionType } }`,
    `kvOperationsAdaptiveGroups(limit: 100, filter: { date_geq: "${monthAgo}", date_leq: "${today}" }) { sum { requests } dimensions { actionType } }`,
  ]);
  await attempt("storage", [
    `kvStorageAdaptiveGroups(limit: 1, filter: { namespaceId: "${process.env.KV_NAMESPACE_ID}", date_geq: "${weekAgo}" }, orderBy: [date_DESC]) { max { keyCount byteCount } dimensions { date } }`,
    `kvStorageAdaptiveGroups(limit: 1, filter: { date_geq: "${weekAgo}" }, orderBy: [date_DESC]) { max { keyCount byteCount } dimensions { date } }`,
  ]);
}

async function images() {
  section("Images transformations (limit 5k unique/month on Free)");
  await attempt("unique month-to-date", [
    `imagesUniqueTransformationsAccumulatedSinceStartOfMonth { count }`,
    `imagesUniqueTransformationsAccumulatedSinceStartOfMonth { sum { count } }`,
    `imagesUniqueTransformationsAccumulatedSinceStartOfMonth { sum { uniqueTransformations } }`,
    `imagesUniqueTransformationsAccumulatedSinceStartOfMonth`,
  ]);
  await attempt("daily transforms", [
    `imagesTransformationsAdaptiveGroups(limit: 31, filter: { date_geq: "${monthStartIso}", date_leq: "${today}" }) { sum { requests } dimensions { date } }`,
    `imagesTransformationsAdaptiveGroups(limit: 31, filter: { date_geq: "${monthStartIso}", date_leq: "${today}" }) { count dimensions { date } }`,
    `imagesUniqueTransformations(limit: 31, filter: { date_geq: "${monthStartIso}" }) { count dimensions { date } }`,
  ]);
}

async function queues() {
  section("Queues (limit 10k ops/day)");
  await attempt("operations 7d", [
    `queueMessageOperationsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}", date_leq: "${today}" }) { sum { billableOperations } dimensions { date } }`,
    `queueMessageOperationsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}", date_leq: "${today}" }) { sum { operations } dimensions { date } }`,
    `queueMessageOperationsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}", date_leq: "${today}" }) { sum { messages } dimensions { date } }`,
    `queueMessageOperationsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}", date_leq: "${today}" }) { count dimensions { date } }`,
  ]);
}

async function durableObjects() {
  section("Durable Objects (limit 100k req/day, 13k GB-s/day)");
  await attempt("invocations 7d", [
    `durableObjectsInvocationsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}", date_leq: "${today}" }) { sum { requests } dimensions { date } }`,
    `durableObjectsInvocationsAdaptiveGroups(limit: 100, filter: { date_geq: "${weekAgo}", date_leq: "${today}" }) { count dimensions { date } }`,
    `durableObjectsInvocationsAdaptiveGroups(limit: 10) { sum { requests } }`,
  ]);
}

async function billableUsage() {
  section("Metered usage rollup (needs Billing: Read on the token)");
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const body = (await rest(
    `/billable/usage?from=${from.toISOString().slice(0, 10)}&to=${to
      .toISOString()
      .slice(0, 10)}`,
  )) as { result?: unknown[]; errors?: { message: string }[] };
  if (body.errors?.length) {
    console.log(
      `not available: ${body.errors.map((e) => e.message).join("; ")}`,
    );
    return;
  }
  console.log(JSON.stringify(body.result ?? body).slice(0, 1500));
}

console.log("Cloudflare usage report");
console.log(`generated: ${new Date().toISOString()}`);
await billableUsage();
await workers();
await d1();
await r2();
await kv();
await images();
await queues();
await durableObjects();
console.log(
  "\nReference free limits: Workers 100k req/day + 10 ms CPU/request; D1 500 MB/db + 5 GB/account; " +
    "KV 100k reads + 1k writes/day; R2 10 GB + 1M Class A + 10M Class B/month; " +
    "Queues 10k ops/day; Durable Objects 100k req/day; Images 5k transforms/month.",
);

export {};
