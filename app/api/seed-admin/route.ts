import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Adjust path to '../../lib/db' if your project doesn't use the '@' alias

export async function GET() {
  try {
    // 1. Enter the email and password you want for your admin account:
    const adminEmail = "admin@flow.com";
    const password = "AdminPassword2026!"; 

    // Note: If your system uses bcrypt hashing, uncomment these lines:
    // const bcrypt = require('bcryptjs');
    // const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: adminEmail,
        password: password, // Change to hashedPassword if your app requires bcrypt!
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      success: true,
      message: "🚀 ADMIN USER CREATED SUCCESSFULLY ON INTERSERVER!",
      email: admin.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}