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
  connectionLimit: 1,
  connectTimeout: 5000,
});
(async () => {
  const conn = await pool.getConnection();
  const rows = await conn.query("SELECT COUNT(*) AS cnt FROM information_schema.processlist WHERE USER = 'flowadmin'");
  console.log(JSON.stringify(rows[0]));
  conn.release();
  await pool.end();
})();
