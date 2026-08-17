"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save, Briefcase, UserPlus, Shield, Mail, Phone, MapPin, Calendar, Users, FileText } from "lucide-react";
import { updateCandidate, getMapsData } from "@/app/actions";

interface CandidateEditorProps {
    candidate: any;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function CandidateEditor({
    candidate,
    isOpen,
    onClose,
    onRefresh,
}: CandidateEditorProps) {
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);

    // Comprehensive state for all old AND new fields
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        alt_phone: "", // NEW: Alternate Phone
        address: "",
        dob: "",
        gender: "",
        experience: "",
        passport_number: "",
        passport_expiry: "",
        status: "Pending",
        current_roles: [] as string[], // NEW: Array for multiple jobs
        assigned_agent_id: "",
        assigned_staff_id: "",
    });

    useEffect(() => {
        if (isOpen) {
            // Fetch dropdown data when the modal opens
            getMapsData().then((data) => {
                if (data.jobs) setJobs(data.jobs);
                if (data.agents) setAgents(data.agents);
                if (data.staff) setStaff(data.staff);
            });

            // Pre-fill the form with existing candidate data
            if (candidate) {
                setFormData({
                    name: candidate.name || "",
                    email: candidate.email || "",
                    phone: candidate.phone || "",
                    alt_phone: candidate.additional_info?.alt_phone || "", // Extract Alt Phone
                    address: candidate.address || "",
                    dob: candidate.dob || "",
                    gender: candidate.gender || "",
                    experience: candidate.experience_years?.toString() || "",
                    passport_number: candidate.passport_number || "",
                    // Extract expiry cleanly from the JSON blob
                    passport_expiry: candidate.additional_info?.passport_expiry || "",
                    status: candidate.status || "Pending",
                    // Split the comma-separated roles into an array
                    current_roles: candidate.current_role ? candidate.current_role.split(',').map((r: string) => r.trim()).filter(Boolean) : [],
                    assigned_agent_id: candidate.assigned_agent_id || "",
                    assigned_staff_id: candidate.assigned_staff_id || "",
                });
            }
        }
    }, [isOpen, candidate]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleToggle = (jobName: string, isChecked: boolean) => {
        setFormData(prev => ({
            ...prev,
            current_roles: isChecked
                ? [...prev.current_roles, jobName]
                : prev.current_roles.filter(role => role !== jobName)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Package the data for the Prisma update
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                dob: formData.dob || null,
                gender: formData.gender,
                experience_years: parseInt(formData.experience, 10) || 0,
                passport_number: formData.passport_number,
                status: formData.status,
                // Join the selected roles back into a comma-separated string
                current_role: formData.current_roles.join(', '),
                assigned_agent_id: formData.assigned_agent_id || null,
                assigned_staff_id: formData.assigned_staff_id || null,
                // Safely merge the passport expiry and alt phone back into the JSON blob without deleting notes/documents
                additional_info: {
                    ...(candidate.additional_info || {}),
                    passport_expiry: formData.passport_expiry || null,
                    alt_phone: formData.alt_phone || null,
                },
            };

            await updateCandidate(candidate.id, payload);
            onRefresh(); // Refresh the parent page data
            onClose();   // Close the slide-over
        } catch (error) {
            console.error("Failed to update candidate:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Quick Edit Profile</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="edit-candidate-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Core Details */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                Full Name
                            </label>
                            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email
                            </label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Phone
                                </label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" /> Alt Phone
                                </label>
                                <input type="tel" name="alt_phone" value={formData.alt_phone} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Address
                            </label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Date of Birth
                                </label>
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Gender
                                </label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all cursor-pointer">
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Documentation & Career */}
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Passport
                                </label>
                                <input type="text" name="passport_number" value={formData.passport_number} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white uppercase transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Passport Expiry
                                </label>
                                <input type="date" name="passport_expiry" value={formData.passport_expiry} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Experience (Years)
                                </label>
                                <input type="number" name="experience" value={formData.experience} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                                    Status
                                </label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all cursor-pointer">
                                    <option value="Pending">Pending</option>
                                    <option value="Interviewing">Interviewing</option>
                                    <option value="Visa Processing">Visa Processing</option>
                                    <option value="Placed">Placed</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        {/* Job & Assignments */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                    <Briefcase className="w-4 h-4" /> Target Job Categories
                                </label>
                                <div className="w-full p-1.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar shadow-inner">
                                    {jobs.length === 0 ? (
                                        <p className="text-xs font-medium text-slate-400 p-3 text-center">Loading categories...</p>
                                    ) : (
                                        jobs.map((job) => {
                                            const isSelected = formData.current_roles.includes(job.name);
                                            return (
                                                <label
                                                    key={job.id}
                                                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={(e) => handleRoleToggle(job.name, e.target.checked)}
                                                    />
                                                    <span className={`text-sm ${isSelected ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                        {job.name}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserPlus className="w-4 h-4" /> Assigned Agent
                                </label>
                                <select name="assigned_agent_id" value={formData.assigned_agent_id} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all cursor-pointer">
                                    <option value="">-- Direct / Unassigned --</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shield className="w-4 h-4" /> Internal Staff
                                </label>
                                <select name="assigned_staff_id" value={formData.assigned_staff_id} onChange={handleChange} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white transition-all cursor-pointer">
                                    <option value="">-- Unassigned --</option>
                                    {staff.map((member) => (
                                        <option key={member.id} value={member.id}>{member.email}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                    <button
                        type="submit"
                        form="edit-candidate-form"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? "Saving Changes..." : "Save Changes"}
                    </button>
                </div>

            </div>
        </div>
    );
}