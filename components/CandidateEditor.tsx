"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Loader2, User, Briefcase, MapPin, Edit3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CandidateEditor({ candidate, isOpen, onClose, onRefresh }: { candidate: any, isOpen: boolean, onClose: () => void, onRefresh: () => void }) {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (candidate) {
            setFormData({
                name: candidate.name || "",
                email: candidate.email || "",
                phone: candidate.phone || "",
                address: candidate.address || "",
                dob: candidate.dob || "",
                gender: candidate.gender || "",
                passport_number: candidate.passport_number || "",
                current_role: candidate.current_role || "",
                experience_years: candidate.experience_years || 0,
                destination_country: candidate.destination_country || "",
                skills: Array.isArray(candidate.skills) ? candidate.skills.join(", ") : (candidate.skills || "")
            });
        }
    }, [candidate]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const skillsArray = typeof formData.skills === 'string'
            ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
            : formData.skills;

        const { error } = await supabase
            .from("candidates")
            .update({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                dob: formData.dob || null,
                gender: formData.gender,
                passport_number: formData.passport_number,
                current_role: formData.current_role,
                experience_years: parseInt(formData.experience_years) || 0,
                destination_country: formData.destination_country,
                skills: skillsArray
            })
            .eq("id", candidate.id);

        if (error) {
            alert(`Error updating candidate: ${error.message}`);
        } else {
            onRefresh();
            onClose();
        }
        setLoading(false);
    };

    // BRANDING FIX: Dynamically generate #CCC
    const displayId = candidate ? `#CCC-${candidate.id.toString().slice(0, 6).toUpperCase()}` : "";

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800">

                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-blue-600" /> Edit Profile
                        </h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">{displayId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-full shadow-sm transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="edit-form" onSubmit={handleSubmit} className="space-y-5">

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <User className="w-3.5 h-3.5" /> Personal Details
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Home Address</label>
                                <textarea rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date of Birth</label>
                                    <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Passport Number</label>
                                <input type="text" value={formData.passport_number} onChange={e => setFormData({ ...formData, passport_number: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <Briefcase className="w-3.5 h-3.5" /> Professional
                            </h3>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Role</label>
                                <input type="text" value={formData.current_role} onChange={e => setFormData({ ...formData, current_role: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Years Experience</label>
                                    <input type="number" value={formData.experience_years} onChange={e => setFormData({ ...formData, experience_years: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Target Country</label>
                                    <select value={formData.destination_country} onChange={e => setFormData({ ...formData, destination_country: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select...</option>
                                        <option value="Israel">Israel</option>
                                        <option value="UAE">UAE</option>
                                        <option value="Saudi Arabia">Saudi Arabia</option>
                                        <option value="Qatar">Qatar</option>
                                        <option value="UK">UK</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Skills (Comma separated)</label>
                                <input type="text" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <button type="submit" form="edit-form" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
}