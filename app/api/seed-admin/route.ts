import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const adminEmail = "admin@flow.com";
    const password = "AdminPassword2026!"; 

    // 1. Properly hash the password with bcryptjs so Auth.js can read it!
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Wipe the old plain-text admin user first so we don't get a duplicate error
    await prisma.user.deleteMany({
      where: { email: adminEmail }
    });

    // 3. Create the clean, securely hashed admin user
    const admin = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: adminEmail,
        password: hashedPassword, // Saving the hash, NOT plain text!
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      success: true,
      message: "🚀 HASHED ADMIN USER UPDATED SUCCESSFULLY ON INTERSERVER!",
      email: admin.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}