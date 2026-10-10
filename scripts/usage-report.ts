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

async function billableUsage() {
  section("Metered usage, last 30 days (free tier included)");
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const body = (await rest(
    `/billable/usage?from=${from.toISOString().slice(0, 10)}&to=${to
      .toISOString()
      .slice(0, 10)}`,
  )) as { result?: JsonRecord[] } | JsonRecord[];
  const records: JsonRecord[] = Array.isArray(body)
    ? body
    : ((body as { result?: JsonRecord[] }).result ?? []);

  if (records.length === 0) {
    console.log("no records returned");
    console.log(JSON.stringify(body).slice(0, 1000));
    return;
  }

  console.log(`records: ${records.length}`);
  const groups = new Map<
    string,
    { unit: string; sum: number; days: Map<string, number> }
  >();
  let recognized = false;
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
    if (!Number.isNaN(quantity)) recognized = true;
    const key = `${service} | ${metric}`;
    const group = groups.get(key) ?? { unit, sum: 0, days: new Map() };
    if (!Number.isNaN(quantity)) {
      group.sum += quantity;
      if (day) group.days.set(day, (group.days.get(day) ?? 0) + quantity);
    }
    groups.set(key, group);
  }

  if (!recognized) {
    console.log(
      "could not recognize quantity fields; raw shape follows\n" +
        JSON.stringify(records.slice(0, 2), null, 2).slice(0, 4000),
    );
    return;
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

async function d1() {
  if (!process.env.D1_DATABASE_ID) return;
  section("D1 database");
  const body = (await rest(`/d1/database/${process.env.D1_DATABASE_ID}`)) as {
    result?: JsonRecord;
  };
  const result = body.result ?? {};
  const numbers = Object.entries(result).filter(
    ([key, value]) =>
      typeof value === "number" && /size|byte|rows|table|read|write/i.test(key),
  );
  for (const [key, value] of numbers) console.log(`${key}: ${value}`);
  if (numbers.length === 0)
    console.log(`keys: ${Object.keys(result).join(", ") || "(none)"}`);
}

async function r2() {
  if (!process.env.BUCKET_NAME) return;
  section("R2 bucket");
  const body = (await rest(`/r2/buckets/${process.env.BUCKET_NAME}/usage`)) as {
    result?: JsonRecord;
    errors?: unknown;
  };
  if (body.errors) {
    console.log(`usage endpoint: ${JSON.stringify(body.errors).slice(0, 300)}`);
    return;
  }
  const result = body.result ?? {};
  for (const [key, value] of Object.entries(result)) {
    if (/size|count|bytes/i.test(key)) console.log(`${key}: ${value}`);
  }
}

async function kv() {
  if (!process.env.KV_NAMESPACE_ID) return;
  section("KV namespace");
  const body = (await rest(
    `/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}/metrics`,
  )) as { result?: JsonRecord; errors?: unknown };
  if (body.errors) {
    console.log(
      `metrics endpoint: ${JSON.stringify(body.errors).slice(0, 300)}`,
    );
    return;
  }
  console.log(JSON.stringify(body.result ?? body).slice(0, 800));
}

async function workers() {
  if (!process.env.WORKER_NAME) return;
  section("Workers invocations, last 7 days");
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
                cpuTime
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
      `graphql errors: ${response.errors.map((e) => e.message).join("; ")}`,
    );
    return;
  }
  type Row = {
    sum: { requests: number; errors: number; cpuTime: number };
    dimensions: { date: string };
  };
  const data = response.data as {
    viewer?: { accounts?: { workersInvocationsAdaptive?: Row[] }[] };
  };
  const rows = data.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  let total = 0;
  let cpu = 0;
  for (const row of rows) {
    total += row.sum.requests;
    cpu += row.sum.cpuTime;
    console.log(
      `${row.dimensions.date}: ${row.sum.requests} req, ${row.sum.errors} err, cpu ${(row.sum.cpuTime / 1000).toFixed(0)} ms total`,
    );
  }
  console.log(
    `7d total: ${total.toLocaleString("en-US")} requests; avg cpu ${
      total ? (cpu / 1000 / total).toFixed(2) : "?"
    } ms/request`,
  );
}

console.log("Cloudflare usage report");
console.log(`generated: ${new Date().toISOString()}`);
await billableUsage();
await workers();
await d1();
await r2();
await kv();
console.log(
  "\nReference free limits: Workers 100k req/day; D1 500 MB/db + 5 GB/account; " +
    "KV 100k reads + 1k writes/day; R2 10 GB + 1M Class A + 10M Class B/month; " +
    "Queues 10k ops/day; Durable Objects 100k req/day; Images 5k transforms/month.",
);

export {};
