/**
 * Zero-Docker local Postgres for running the app. Boots an embedded Postgres on port 5433,
 * creates the `clipwave` database, and stays alive so the web server can use it.
 * Run in the background:  node scripts/dev-db.mjs
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";
import path from "path";

const DATA_DIR = path.resolve(".data/pg");
const PORT = Number(process.env.DEV_DB_PORT || 5433);

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "clipwave",
  password: "clipwave",
  port: PORT,
  persistent: true,
});

const fresh = !existsSync(path.join(DATA_DIR, "PG_VERSION"));
if (fresh) {
  console.log("Initialising embedded Postgres data dir…");
  await pg.initialise();
}
await pg.start();
console.log(`Embedded Postgres running on 127.0.0.1:${PORT}`);

if (fresh) {
  try {
    await pg.createDatabase("clipwave");
    console.log("Created database 'clipwave'.");
  } catch (e) {
    console.log("createDatabase:", e.message);
  }
}

console.log(`DATABASE_URL=postgresql://clipwave:clipwave@127.0.0.1:${PORT}/clipwave?schema=public`);
console.log("Ready. Leave this process running.");

const stop = async () => { try { await pg.stop(); } catch {} process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// Keep alive.
setInterval(() => {}, 1 << 30);
