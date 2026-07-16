import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, password, role, permissions } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const finalPermissions = role === "admin"
            ? {
                can_add_candidates: true,
                can_edit_candidates: true,
                can_delete_candidates: true,
                can_manage_agents: true,
                can_export_excel: true
            }
            : permissions;

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                role: role,
                permissions: finalPermissions
            }
        });

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 200 });
    } catch (error: any) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}