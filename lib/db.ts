import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Clean & Secure: No hardcoded credentials left in the source code!
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing!");
}

const parseMariaDbConfig = (urlString: string) => {
  const parsed = new URL(urlString);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.replace(/^\/+/, ""),
    connectionLimit: 10, // <--- BUMP THIS UP TO 10
    connectTimeout: 5000,
    idleTimeout: 30000,
  };
};

// Prisma 7 requires either a driver adapter or an accelerateUrl.
const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb(parseMariaDbConfig(connectionString));
  return new PrismaClient({ adapter });
};

declare global {
  var prismaNativeInstanceV2: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaNativeInstanceV2 ?? prismaClientSingleton();

export default prisma;
export { prisma };

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaNativeInstanceV2 = prisma;
}