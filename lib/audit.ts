import { supabase } from "./supabase";

export const logAction = async (action: string, details: string) => {
  try {
    await supabase.from("audit_logs").insert([
      {
        user_name: "Admin User", // In the future, pull this from Supabase Auth!
        action: action,
        details: details
      }
    ]);
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};