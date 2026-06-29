"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Settings as SettingsIcon, Shield, UserPlus, Mail, Lock, Loader2, Briefcase, Building2, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage({ text: "System user added successfully!", type: "success" });
      setNewEmail("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="pt-16 sm:pt-8 px-4 sm:px-8 pb-8 max-w-4xl mx-auto w-full transition-all duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
          System Settings
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2">Manage your account and system access.</p>
      </div>

      <div className="space-y-8">
        {/* Personal Account Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-450 shrink-0" /> My Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="text-slate-900 dark:text-white font-semibold text-sm bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">{profile?.email}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 mb-1.5 uppercase tracking-wider">Access Role</label>
              <div className="mt-1">
                <span className={`inline-flex px-3 py-1 rounded-md text-xs font-extrabold ${profile?.role === 'admin' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-805/50'}`}>
                  {profile?.role === 'admin' ? 'Admin' : 'Employee'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SYSTEM DATA & CONFIGURATION - NEW SECTION */}
        {profile?.role === "admin" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" /> System Data
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">Manage master lists and global configurations used across the application.</p>

            <Link href="/settings/job-categories" className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Manage Job Categories</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add, edit, or permanently delete the target roles used by the AI and dropdowns.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </Link>
          </div>
        )}

        {/* Team Management Section - Visible ONLY to ADMINS */}
        {profile?.role === "admin" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-450 shrink-0" /> Add New System User
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">Create login credentials for internal Employees or Admins. (To add external Agents, use the Agents tab in the sidebar).</p>

            <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-sm transition-all" placeholder="user@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Temporary Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-sm transition-all" placeholder="Min 6 characters" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">System Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-sm transition-all">
                  <option value="employee">Internal Employee</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              {message.text && (
                <div className={`p-3 rounded-lg text-sm font-semibold border ${message.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-750 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-750 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : "Create Account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}