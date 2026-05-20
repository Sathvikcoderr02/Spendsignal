/**
 * Apply Round 2 Supabase migrations via direct Postgres connection.
 *
 * Add to web/.env.local (from Supabase → Project Settings → Database):
 *   SUPABASE_DB_PASSWORD=your-database-password
 *
 * Or set full connection string:
 *   DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
 *
 * Run: npm run db:migrate:round2
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const envPath = path.join(webRoot, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getConnectionString() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!supabaseUrl || !password) {
    return null;
  }

  let ref;
  try {
    ref = new URL(supabaseUrl).hostname.split(".")[0];
  } catch {
    return null;
  }

  const encoded = encodeURIComponent(password);
  return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
}

async function main() {
  loadEnvFile(envPath);

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error(
      [
        "Missing database credentials.",
        "",
        "Option A — add to web/.env.local:",
        "  SUPABASE_DB_PASSWORD=<from Supabase → Settings → Database>",
        "",
        "Option B — set DATABASE_URL (connection string URI from same page).",
        "",
        "Option C — paste web/supabase/apply_round2_migrations.sql into Supabase SQL Editor and run.",
      ].join("\n"),
    );
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Install pg first: cd web && npm install");
    process.exit(1);
  }

  const sqlPath = path.join(webRoot, "supabase", "apply_round2_migrations.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new pg.default.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connecting to Supabase Postgres…");
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'public_audits'
        and column_name in (
          'email', 'input_stack', 'pricing_snapshot', 'pricing_version',
          'last_change_payload', 'change_detected_at'
        )
      order by column_name;
    `);
    console.log("Round 2 columns present:", rows.map((r) => r.column_name).join(", "));
    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
