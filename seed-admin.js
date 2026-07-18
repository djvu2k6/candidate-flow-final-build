const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Enter the email and password you want to use for logging in:
  const adminEmail = "admin@flow.com";
  const password = "AdminPassword2026!"; 

  // Note: If your auth.ts requires bcrypt hashed passwords, uncomment these two lines:
  // const bcrypt = require('bcryptjs');
  // const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: adminEmail,
      // If using bcrypt above, change 'password' below to 'hashedPassword':
      password: password, 
      role: "ADMIN",
    },
  });

  console.log("=========================================");
  console.log("🚀 ADMIN USER CREATED SUCCESSFULLY ON INTERSERVER!");
  console.log(`Email:    ${admin.email}`);
  console.log(`Password: ${password}`);
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding admin:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });