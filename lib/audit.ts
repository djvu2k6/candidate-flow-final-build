import { supabase } from "./supabase";

export const logAction = async (action: string, details: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userName = user?.email || "System/Visitor";
    await supabase.from("audit_logs").insert([
      {
        user_name: userName,
        action: action,
        details: details
      }
    ]);
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};