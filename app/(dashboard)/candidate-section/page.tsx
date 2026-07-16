"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, Download, CheckSquare, Square, Loader2, Filter, AlertTriangle, Trash2 } from "lucide-react";
import { logAction } from "@/lib/audit";
import { getCurrentProfile, getCandidatesList, bulkDeleteCandidates } from "@/app/actions";

// Helper function to calculate exact age dynamically
const calculateAge = (dobString: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export default function CandidateSectionPage() {
    const router = useRouter();

    const [candidates, setCandidates] = useState<any[]>([]);
    const [jobCategories, setJobCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Role State for Admin Permissions
    const [currentUserRole, setCurrentUserRole] = useState<string>("staff");

    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedJobFilter, setSelectedJobFilter] = useState("");

    // Multi-Select State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchData = async () => {
        setLoading(true);

        // 1. Get Current User Role
        const profileData = await getCurrentProfile();
        if (profileData) setCurrentUserRole(profileData.role?.toLowerCase() || "staff");

        // 2. Fetch Candidates and Job Categories
        try {
            const { candidates: candData, jobCategories: jobsData } = await getCandidatesList();
            setCandidates(candData);
            setJobCategories(jobsData);
        } catch (error) {
            console.error("Error fetching candidates:", error);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter logic
    const filteredCandidates = candidates.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.passport_number?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesJob = selectedJobFilter === "" || c.current_role === selectedJobFilter;
        return matchesSearch && matchesJob;
    });

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCandidates.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // Bulk Export
    const exportSelectedToExcel = () => {
        if (selectedIds.size === 0) return;
        const selectedData = candidates.filter(c => selectedIds.has(c.id));

        const headers = ["Candidate ID", "Name", "Age", "Passport", "Phone", "Target Role", "Experience", "Agent"];
        const rows = selectedData.map(c => {
            const cccId = `#CCC-${c.id.toString().slice(0, 6).toUpperCase()}`;
            const age = c.dob ? calculateAge(c.dob) : 'N/A';
            return [
                cccId,
                `"${c.name || ''}"`,
                age,
                c.passport_number || '',
                c.phone || '',
                `"${c.current_role || ''}"`,
                c.experience_years || 0,
                `"${c.agents?.name || 'Unassigned'}"`
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Clockwise_Candidates_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // NEW: Bulk Delete (Admin Only)
    const handleBulkDelete = async () => {
        if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${selectedIds.size} candidates? This will wipe all their documents and interview logs. This action cannot be undone.`)) return;

        setLoading(true);
        const idsToDelete = Array.from(selectedIds);

        try {
            await bulkDeleteCandidates(idsToDelete);
            await logAction("BULK_DELETE", `Admin deleted ${selectedIds.size} candidates from the master table.`);

            // 3. Reset state and refresh table
            setSelectedIds(new Set());
            fetchData();
        } catch (err: any) {
            alert(`Failed to delete candidates: ${err.message}`);
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        Clockwise Candidates
                    </h1>
                    <p className="text-slate-500 mt-2">Manage, filter, and export candidate profiles.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* EXPORT BUTTON */}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={exportSelectedToExcel}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all"
                        >
                            <Download className="w-5 h-5" />
                            Export Selected ({selectedIds.size})
                        </button>
                    )}

                    {/* NEW: ADMIN BULK DELETE BUTTON */}
                    {currentUserRole === 'admin' && selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition-all shadow-rose-600/20 animate-in fade-in zoom-in duration-200"
                        >
                            <Trash2 className="w-5 h-5" />
                            Delete Selected
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search names or passports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <select
                            value={selectedJobFilter}
                            onChange={(e) => setSelectedJobFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 text-sm appearance-none text-slate-900 dark:text-white cursor-pointer"
                        >
                            <option value="">All Job Categories</option>
                            {jobCategories.map(job => (
                                <option key={job.id} value={job.name}>{job.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 w-12 text-center cursor-pointer" onClick={toggleSelectAll}>
                                    {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0
                                        ? <CheckSquare className="w-5 h-5 text-blue-600 mx-auto" />
                                        : <Square className="w-5 h-5 text-slate-400 mx-auto hover:text-slate-600" />}
                                </th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate ID</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Info</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target Role</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source Agent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">No candidates found matching the criteria.</td>
                                </tr>
                            ) : (
                                filteredCandidates.map((c) => {
                                    const isSelected = selectedIds.has(c.id);
                                    const displayId = `#CCC-${c.id.toString().slice(0, 6).toUpperCase()}`;

                                    const age = c.dob ? calculateAge(c.dob) : null;
                                    const isAgeWarning = age !== null && (age < 25 || age > 44);

                                    return (
                                        <tr
                                            key={c.id}
                                            onClick={() => router.push(`/candidate/${c.id}`)}
                                            className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <td className="p-4 text-center cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}>
                                                {isSelected
                                                    ? <CheckSquare className="w-5 h-5 text-blue-600 mx-auto" />
                                                    : <Square className="w-5 h-5 text-slate-300 mx-auto hover:text-slate-500" />}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-500 font-mono">
                                                {displayId}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                    {c.name}
                                                    {age !== null && (
                                                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-black flex items-center gap-1 ${isAgeWarning ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)] border border-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                            {isAgeWarning && <AlertTriangle className="w-3 h-3" />}
                                                            {age} yrs
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Pass: {c.passport_number || "PENDING"}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                                                    {c.current_role || "Uncategorized"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {c.agents?.name ? (
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                        {c.agents.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Direct Entry</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}