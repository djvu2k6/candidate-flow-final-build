import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// 1. Grab your connection string (with %25 replacing the % in your password!)
const connectionString = process.env.DATABASE_URL || "mysql://absorbs_admin:absorbs%25123@abrobs.com:3306/abrobsco_";

// 2. Initialize the Prisma MariaDB Adapter
const adapter = new PrismaMariaDb(connectionString);

// 3. Pass the adapter into the PrismaClient constructor
const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;
export { prisma };

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}