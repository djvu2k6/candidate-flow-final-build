import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// You MUST use the service role key here to bypass RLS and create auth users securely
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        // 1. Catch the new details and permissions object from the frontend form
        const { email, password, role, permissions } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // 2. Create the Auth User in Supabase
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to generate user ID.");

        // 3. If they are an Admin, force all permissions to true. Otherwise, save the checked boxes!
        const finalPermissions = role === "admin"
            ? {
                can_add_candidates: true,
                can_edit_candidates: true,
                can_delete_candidates: true,
                can_manage_agents: true,
                can_export_excel: true
            }
            : permissions;

        // 4. BULLETPROOF UPSERT: Avoids "profiles_pkey" duplicate key errors!
        // If a database trigger already created the profile, this updates it. If not, it inserts it.
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: authData.user.id,
                email: email,
                role: role,
                permissions: finalPermissions
            }, { onConflict: "id" });

        if (profileError) {
            // If profile creation fails, let's log it clearly
            console.error("Profile Upsert Error:", profileError);
            throw profileError;
        }

        return NextResponse.json({ success: true, user: authData.user }, { status: 200 });
    } catch (error: any) {
        console.error("Create user error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}