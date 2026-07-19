import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/auth"; // Adjust import if your NextAuth handler export is located elsewhere

export async function POST(req: Request) {
    try {
        // 1. Verify that the person making the request is an ADMIN
        const session = await auth();
        if (!session?.user || session.user.role?.toUpperCase() !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const { email, password, role, permissions } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // 2. Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }

        // 3. Hash the temporary password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Save the new staff member and their explicit permissions in InterServer MariaDB
        const newUser = await prisma.user.create({
            data: {
                email,
                name: email.split("@")[0], // Default name from email prefix
                password: hashedPassword,
                role: role.toUpperCase(),  // Stores as 'ADMIN' or 'EMPLOYEE'
                // If your Prisma schema stores permissions as a JSON field named 'permissions':
                permissions: permissions ?? undefined,
            },
        });

        return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email } });
    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}