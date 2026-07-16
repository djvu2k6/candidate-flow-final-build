"use client";

import React, { useState, useEffect } from "react";
import { X, Save, UserPlus, Shield, Loader2, Briefcase } from "lucide-react";
import { logAction } from "@/lib/audit";
import { getMapsData, updateCandidate } from "@/app/actions";

export default function CandidateEditor({ candidate, isOpen, onClose, onRefresh }: any) {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // Dropdown Data
    const [jobs, setJobs] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);

    useEffect(() => {
        if (candidate) {
            setFormData({
                name: candidate.name || "",
                email: candidate.email || "",
                phone: candidate.phone || "",
                current_role: candidate.current_role || "",
                passport_number: candidate.passport_number || "",
                status: candidate.status || "Pending",
                assigned_agent_id: candidate.assigned_agent_id || "",
                assigned_staff_id: candidate.assigned_staff_id || ""
            });
        }
    }, [candidate]);

    useEffect(() => {
        if (isOpen) {
            const fetchDependencies = async () => {
                const { jobs, agents, staff } = await getMapsData();
                if (jobs) setJobs(jobs);
                if (agents) setAgents(agents);
                if (staff) setStaff(staff);
            };
            fetchDependencies();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateCandidate(candidate.id, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                current_role: formData.current_role,
                passport_number: formData.passport_number,
                status: formData.status,
                assigned_agent_id: formData.assigned_agent_id || null, // Saves the new Agent
                assigned_staff_id: formData.assigned_staff_id || null  // Saves the new Staff
            });

            await logAction("CANDIDATE_UPDATE", `Updated profile assignments for ${formData.name}`);
            onRefresh(); // Forces the table to reload instantly
            onClose();
        } catch (error: any) {
            alert("Error saving: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Quick Edit Profile</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="edit-form" onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Full Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Passport</label>
                                <input type="text" value={formData.passport_number} onChange={e => setFormData({ ...formData, passport_number: e.target.value })} className="w-full p-2.5 text-sm uppercase bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Status</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full p-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500">
                                    <option value="Pending">Pending</option>
                                    <option value="Interviewing">Interviewing</option>
                                    <option value="Visa Processing">Visa Processing</option>
                                    <option value="Placed">Placed</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5 uppercase">
                                <Briefcase className="w-3.5 h-3.5" /> Target Job Category
                            </label>
                            <select value={formData.current_role} onChange={e => setFormData({ ...formData, current_role: e.target.value })} className="w-full p-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500">
                                <option value="Uncategorized">Uncategorized</option>
                                {jobs.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
                            </select>
                        </div>

                        {/* SYNC FIX: AGENT DROPDOWN */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5 uppercase">
                                <UserPlus className="w-3.5 h-3.5" /> Assigned Agent
                            </label>
                            <select value={formData.assigned_agent_id} onChange={e => setFormData({ ...formData, assigned_agent_id: e.target.value })} className="w-full p-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500">
                                <option value="">-- Direct / Unassigned --</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        {/* SYNC FIX: STAFF DROPDOWN */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase">
                                <Shield className="w-3.5 h-3.5" /> Internal Staff
                            </label>
                            <select value={formData.assigned_staff_id} onChange={e => setFormData({ ...formData, assigned_staff_id: e.target.value })} className="w-full p-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500">
                                <option value="">-- Unassigned --</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                            </select>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <button form="edit-form" type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}