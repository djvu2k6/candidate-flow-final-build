require("dotenv").config();
const { URL } = require("url");
const parsed = new URL(process.env.DATABASE_URL);
const mariadb = require("mariadb");
const pool = mariadb.createPool({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.replace(/^\/+/, ""),
  connectionLimit: 2,
  connectTimeout: 5000,
});
(async () => {
  const conn = await pool.getConnection();
  const rows = await conn.query("SHOW PROCESSLIST");
  console.log("processlist-count", rows.length);
  console.log(rows.slice(0, 10).map((r) => JSON.stringify({ id: r.Id, user: r.User, host: r.Host, db: r.db, command: r.Command })).join("\n"));
  conn.release();
  await pool.end();
})();
