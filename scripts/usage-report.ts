/**
 * Prints Cloudflare account usage next to the free-tier limits, so the blog's
 * headroom is visible at a glance. Runs from the "Usage Report" workflow with
 * the repository's Cloudflare secrets.
 *
 * Required: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
 * Optional (extra sections): D1_DATABASE_ID, BUCKET_NAME, KV_NAMESPACE_ID,
 * WORKER_NAME. Locally, without a token, it skips with a hint.
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

async function graphql(query: string, variables: Record<string, unknown>) {
  const response = await fetch(`${API}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as {
    data?: unknown;
    errors?: { message: string }[];
  };
}

/** Runs a GraphQL query; on error prints it and returns undefined. */
async function query(
  label: string,
  text: string,
  variables: Record<string, unknown> = {},
): Promise<unknown | undefined> {
  const response = await graphql(text, variables);
  if (response.errors?.length) {
    console.log(
      `${label}: graphql error - ${response.errors
        .map((error) => error.message)
        .join("; ")}`,
    );
    return undefined;
  }
  return response.data;
}

function section(title: string) {
  console.log(`\n## ${title}`);
}

type JsonRecord = Record<string, unknown>;

function pick(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    const found = Object.keys(record).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase(),
    );
    if (found) return record[found];
  }
  return undefined;
}

async function schemaProbe() {
  section("GraphQL schema probe (diagnostic)");
  for (const typeName of ["account", "Account"]) {
    const data = (await query(
      typeName,
      `query { __type(name: "${typeName}") { fields { name } } }`,
    )) as { __type?: { fields?: { name: string }[] } } | undefined;
    const fields = data?.__type?.fields;
    if (!fields) {
      console.log(`${typeName}: no such type`);
      continue;
    }
    const interesting = fields
      .map((field) => field.name)
      .filter((name) => /worker|r2|kv|d1|queue|durable|image/i.test(name));
    console.log(
      `${typeName} (${fields.length} fields): ${
        interesting.join(", ") || "(no matches)"
      }`,
    );
    return;
  }
}

async function billableUsage() {
  section("Metered usage, last 30 days (needs Billing: Read)");
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const body = (await rest(
    `/billable/usage?from=${from.toISOString().slice(0, 10)}&to=${to
      .toISOString()
      .slice(0, 10)}`,
  )) as { result?: JsonRecord[]; errors?: { message: string }[] };
  if (body.errors?.length) {
    console.log(
      `not available: ${body.errors.map((e) => e.message).join("; ")}`,
    );
    return;
  }
  const records = body.result ?? [];
  if (records.length === 0) {
    console.log("no records returned");
    return;
  }

  console.log(`records: ${records.length}`);
  const groups = new Map<
    string,
    { unit: string; sum: number; days: Map<string, number> }
  >();
  for (const record of records) {
    const service =
      pick(record, ["ServiceName", "Service", "ProductName"]) ?? "?";
    const metric =
      pick(record, [
        "ChargeDescription",
        "MeterName",
        "SkuId",
        "ResourceName",
      ]) ?? "?";
    const quantity = Number(
      pick(record, ["ConsumedQuantity", "Quantity", "UsageQuantity"]) ?? NaN,
    );
    const unit = String(pick(record, ["ConsumedUnit", "Unit"]) ?? "");
    const day = String(
      pick(record, ["ChargePeriodStart", "Date", "PeriodStart"]) ?? "",
    ).slice(0, 10);
    const key = `${service} | ${metric}`;
    const group = groups.get(key) ?? { unit, sum: 0, days: new Map() };
    if (!Number.isNaN(quantity)) {
      group.sum += quantity;
      if (day) group.days.set(day, (group.days.get(day) ?? 0) + quantity);
    }
    groups.set(key, group);
  }

  const rows = [...groups.entries()].sort((a, b) => b[1].sum - a[1].sum);
  for (const [key, group] of rows.slice(0, 60)) {
    const daily = [...group.days.values()];
    const peak = daily.length ? Math.max(...daily) : 0;
    const days = group.days.size;
    console.log(
      `${key} = ${group.sum.toLocaleString("en-US")} ${group.unit} over ${days}d` +
        (days > 1 && peak > 0
          ? ` (peak/day ${peak.toLocaleString("en-US")})`
          : ""),
    );
  }
  if (rows.length > 60) console.log(`... and ${rows.length - 60} more rows`);
}

async function workers() {
  if (!process.env.WORKER_NAME) return;
  section("Workers invocations, last 7 days");
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86_400_000);
  const common = {
    account: accountId,
    script: process.env.WORKER_NAME,
    from: from.toISOString(),
    to: to.toISOString(),
  };

  type Row = {
    sum: { requests: number; errors: number };
    quantiles?: { cpuTimeP50?: number; cpuTimeP99?: number };
    dimensions: { date: string };
  };
  const selection = (
    withQuantiles: boolean,
  ) => `query ($account: String!, $script: String!, $from: Time!, $to: Time!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          workersInvocationsAdaptive(
            limit: 1000
            filter: { scriptName: $script, datetime_geq: $from, datetime_leq: $to }
          ) {
            sum { requests errors }
            ${withQuantiles ? "quantiles { cpuTimeP50 cpuTimeP99 }" : ""}
            dimensions { date }
          }
        }
      }
    }`;

  let data = (await query(
    "workers (with quantiles)",
    selection(true),
    common,
  )) as
    | {
        viewer?: { accounts?: { workersInvocationsAdaptive?: Row[] }[] };
      }
    | undefined;
  if (!data) {
    data = (await query("workers", selection(false), common)) as typeof data;
  }
  if (!data) return;

  const rows = data.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  let total = 0;
  for (const row of rows) {
    total += row.sum.requests;
    const p50 = row.quantiles?.cpuTimeP50;
    const p99 = row.quantiles?.cpuTimeP99;
    console.log(
      `${row.dimensions.date}: ${row.sum.requests.toLocaleString("en-US")} req, ${row.sum.errors} err` +
        (p50 !== undefined
          ? `, cpu p50 ${(p50 / 1000).toFixed(1)} ms, p99 ${((p99 ?? 0) / 1000).toFixed(1)} ms`
          : ""),
    );
  }
  console.log(`7d total: ${total.toLocaleString("en-US")} requests`);
}

async function d1() {
  if (!process.env.D1_DATABASE_ID) return;
  section("D1 database");
  const body = (await rest(`/d1/database/${process.env.D1_DATABASE_ID}`)) as {
    result?: JsonRecord;
  };
  const result = body.result ?? {};
  for (const [key, value] of Object.entries(result)) {
    if (
      typeof value === "number" &&
      /size|byte|rows|table|read|write/i.test(key)
    ) {
      console.log(`${key}: ${value}`);
    }
  }
}

async function r2() {
  if (!process.env.BUCKET_NAME) return;
  section("R2 bucket");
  const body = (await rest(`/r2/buckets/${process.env.BUCKET_NAME}/usage`)) as {
    result?: JsonRecord;
    errors?: { message: string }[];
  };
  if (body.errors?.length) {
    console.log(
      `usage endpoint: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  } else if (body.result) {
    console.log(JSON.stringify(body.result));
  } else {
    console.log(JSON.stringify(body).slice(0, 500));
  }

  const bucket = process.env.BUCKET_NAME;
  const data = (await query(
    "r2 storage",
    `query ($account: String!, $bucket: String!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          r2StorageAdaptiveGroups(
            limit: 1
            filter: { bucketName: $bucket }
            orderBy: [date_DESC]
          ) {
            max { objectCount payloadSize metadataSize }
            dimensions { date }
          }
        }
      }
    }`,
    { account: accountId, bucket },
  )) as
    | {
        viewer?: {
          accounts?: {
            r2StorageAdaptiveGroups?: {
              max: { objectCount: number; payloadSize: number };
              dimensions: { date: string };
            }[];
          }[];
        };
      }
    | undefined;
  const storage = data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups?.[0];
  if (storage) {
    console.log(
      `storage (${storage.dimensions.date}): ${storage.max.objectCount.toLocaleString("en-US")} objects, ` +
        `${(storage.max.payloadSize / 1024 / 1024).toFixed(2)} MiB payload`,
    );
  }

  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const operations = (await query(
    "r2 operations",
    `query ($account: String!, $bucket: String!, $from: Date!, $to: Date!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          r2OperationsAdaptiveGroups(
            limit: 1000
            filter: { bucketName: $bucket, date_geq: $from, date_leq: $to }
          ) {
            sum { requests }
            dimensions { actionType }
          }
        }
      }
    }`,
    {
      account: accountId,
      bucket,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
  )) as
    | {
        viewer?: {
          accounts?: {
            r2OperationsAdaptiveGroups?: {
              sum: { requests: number };
              dimensions: { actionType: string };
            }[];
          }[];
        };
      }
    | undefined;
  const operationsRows =
    operations?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups ?? [];
  for (const row of operationsRows) {
    console.log(
      `30d ${row.dimensions.actionType}: ${row.sum.requests.toLocaleString("en-US")} requests`,
    );
  }
}

async function kv() {
  if (!process.env.KV_NAMESPACE_ID) return;
  section("KV namespace");
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const data = (await query(
    "kv operations",
    `query ($account: String!, $from: Time!, $to: Time!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          kvOperationsAdaptiveGroups(
            limit: 1000
            filter: { datetime_geq: $from, datetime_leq: $to }
          ) {
            sum { requests }
            dimensions { actionType }
          }
        }
      }
    }`,
    { account: accountId, from: from.toISOString(), to: to.toISOString() },
  )) as
    | {
        viewer?: {
          accounts?: {
            kvOperationsAdaptiveGroups?: {
              sum: { requests: number };
              dimensions: { actionType: string };
            }[];
          }[];
        };
      }
    | undefined;
  const rows = data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups ?? [];
  if (rows.length === 0) console.log("no KV operation data");
  for (const row of rows) {
    console.log(
      `30d ${row.dimensions.actionType}: ${row.sum.requests.toLocaleString("en-US")} requests`,
    );
  }
}

console.log("Cloudflare usage report");
console.log(`generated: ${new Date().toISOString()}`);
await schemaProbe();
await billableUsage();
await workers();
await d1();
await r2();
await kv();
console.log(
  "\nReference free limits: Workers 100k req/day + 10 ms CPU/request; D1 500 MB/db + 5 GB/account; " +
    "KV 100k reads + 1k writes/day; R2 10 GB + 1M Class A + 10M Class B/month; " +
    "Queues 10k ops/day; Durable Objects 100k req/day; Images 5k transforms/month.",
);

export {};
