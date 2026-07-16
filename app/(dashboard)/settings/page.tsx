"use client";

import React, { useEffect, useState } from "react";
import { getCurrentProfile } from "@/app/actions";
import Link from "next/link";
import {
  Settings as SettingsIcon, Shield, UserPlus, Mail, Lock,
  Loader2, Briefcase, Building2, ChevronRight, CheckSquare
} from "lucide-react";
import { DEFAULT_EMPLOYEE_PERMISSIONS, UserPermissions, canAccessJobCategories } from "@/lib/permissions";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("employee");

  // Use our centralized default permissions
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const loadProfile = async () => {
      const profileData = await getCurrentProfile();
      setProfile(profileData);
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleCheckboxChange = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
          permissions: permissions
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ text: "System user added successfully with customized permissions!", type: "success" });
      setNewEmail("");
      setNewPassword("");
      setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 font-bold text-slate-500">Loading settings...</div>;

  // Evaluate if current user can see Job Categories link
  const showJobCategories = canAccessJobCategories(profile);

  return (
    <div className="pt-6 sm:pt-8 px-4 sm:px-8 pb-12 max-w-4xl mx-auto w-full transition-all duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
          <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
          System Settings
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Manage your account and system access.</p>
      </div>

      <div className="space-y-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors duration-300">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0" /> My Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="text-slate-900 dark:text-white font-semibold text-sm bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 truncate">{profile?.email}</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Access Role</label>
              <div className="mt-1">
                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-extrabold border ${profile?.role === 'admin' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800/60' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/60'}`}>
                  {profile?.role === 'admin' ? 'System Admin' : 'Internal Employee'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Data: Job Categories (Visible to Admins AND authorized Employees!) */}
        {showJobCategories && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors duration-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" /> System Data
            </h2>
            <Link href="/settings/job-categories" className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group cursor-pointer">
              <div className="flex items-center gap-4 pr-2">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Manage Job Categories</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add, edit, or delete target job roles used across the AI and dropdowns.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
            </Link>
          </div>
        )}

        {/* Admin Section: Add User & Granular RBAC */}
        {profile?.role === "admin" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors duration-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" /> Add New System User
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">Create login credentials and assign explicit feature permissions.</p>

            <form onSubmit={handleCreateUser} className="space-y-6 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 shrink-0" />
                  <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" placeholder="user@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Temporary Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400 shrink-0" />
                  <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all" placeholder="Min 6 characters" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">System Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold transition-all">
                  <option value="employee">Internal Employee</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              {/* GRANULAR PERMISSIONS GRID (Only mounts for Employees) */}
              {newRole === "employee" && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Explicit Feature Permissions
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Check exactly what this employee is authorized to do. Base viewing rights are included automatically.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                      <input type="checkbox" checked={permissions.can_add_candidates} onChange={() => handleCheckboxChange("can_add_candidates")} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" />
                      <div>
                        <span>Add New Candidates</span>
                        <span className="block text-[9px] text-indigo-500 dark:text-indigo-400 font-extrabold">+ Job Categories Access</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                      <input type="checkbox" checked={permissions.can_edit_candidates} onChange={() => handleCheckboxChange("can_edit_candidates")} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" />
                      <span>Edit Profiles & Status</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                      <input type="checkbox" checked={permissions.can_export_excel} onChange={() => handleCheckboxChange("can_export_excel")} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" />
                      <div>
                        <span>Export Data to Excel</span>
                        <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold">Base Report Right</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                      <input type="checkbox" checked={permissions.can_manage_agents} onChange={() => handleCheckboxChange("can_manage_agents")} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" />
                      <div>
                        <span>Manage Source Agents</span>
                        <span className="block text-[9px] text-blue-500 font-extrabold">Add & Edit Partners</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-rose-500 transition-all sm:col-span-2">
                      <input type="checkbox" checked={permissions.can_delete_candidates} onChange={() => handleCheckboxChange("can_delete_candidates")} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" />
                      <div>
                        <span className="text-rose-600 dark:text-rose-400">Delete Candidates</span>
                        <span className="block text-[9px] text-slate-400 font-bold">Destructive Right (Optional)</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {message.text && (
                <div className={`p-3.5 rounded-xl text-sm font-bold border ${message.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : "Create Account & Save Permissions"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}