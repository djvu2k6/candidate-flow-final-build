require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const parsed = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.replace(/^\/+/, ""),
  connectionLimit: 1,
  connectTimeout: 5000,
  idleTimeout: 30000,
});
(async () => {
  const prisma = new PrismaClient({ adapter });
  const count = await prisma.jobCategory.count();
  console.log("jobCategory-count", count);
  await prisma.$disconnect();
})();
