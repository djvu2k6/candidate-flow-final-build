"use server";

import { prisma } from "./db";
import { auth } from "@/auth";

export const logAction = async (action: string, details: string) => {
  try {
    const session = await auth();
    const userName = session?.user?.email || "System/Visitor";
    
    await prisma.auditLog.create({
      data: {
        user_name: userName,
        action: action,
        details: details
      }
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};