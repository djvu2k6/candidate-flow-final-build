"use client";

import React, { useState, useEffect } from "react";
import { logAction } from "@/lib/audit";
import { getCandidateStatusLogs, addCandidateStatusLog, getCurrentProfile } from "@/app/actions";
import { Plus, Loader2, CheckCircle2, Clock, XCircle, Briefcase, FileCheck, Globe, Pause, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface StatusLogEntry {
    id: string;
    status_label: string;
    note?: string;
    created_by?: string;
    created_at: string;
}

interface CandidateStatusLogProps {
    candidateId: string;
    candidateName: string;
}

const STATUS_OPTIONS = [
    "Pending Review",
    "Docs Submitted",
    "Interviewed",
    "Visa Applied",
    "Offer Made",
    "Placed",
    "On Hold",
    "Rejected",
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; dot: string }> = {
    "Pending Review":  { icon: <Clock className="w-3.5 h-3.5" />,       color: "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200 dark:border-slate-700",          dot: "bg-slate-400" },
    "Docs Submitted":  { icon: <FileCheck className="w-3.5 h-3.5" />,    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800/50",              dot: "bg-blue-500" },
    "Interviewed":     { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 border-violet-100 dark:border-violet-800/50",  dot: "bg-violet-500" },
    "Visa Applied":    { icon: <Globe className="w-3.5 h-3.5" />,         color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800/50",        dot: "bg-amber-500" },
    "Offer Made":      { icon: <Briefcase className="w-3.5 h-3.5" />,    color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800/50",              dot: "bg-cyan-500" },
    "Placed":          { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50", dot: "bg-emerald-500" },
    "On Hold":         { icon: <Pause className="w-3.5 h-3.5" />,         color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-800/50",  dot: "bg-orange-500" },
    "Rejected":        { icon: <XCircle className="w-3.5 h-3.5" />,      color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800/50",              dot: "bg-rose-500" },
};

const getConfig = (label: string) =>
    STATUS_CONFIG[label] ?? { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700", dot: "bg-slate-400" };

export default function CandidateStatusLog({ candidateId, candidateName }: CandidateStatusLogProps) {
    const [logs, setLogs] = useState<StatusLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [newStatus, setNewStatus] = useState(STATUS_OPTIONS[0]);
    const [newNote, setNewNote] = useState("");

    const fetchLogs = async () => {
        const data = await getCandidateStatusLogs(candidateId);
        if (data) setLogs(data as unknown as StatusLogEntry[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [candidateId]);

    const handleAdd = async () => {
        setIsSaving(true);
        try {
            const profile = await getCurrentProfile();
            const createdBy = profile?.email || "System";

            await addCandidateStatusLog({
                candidate_id: candidateId,
                status_label: newStatus,
                note: newNote.trim() || null,
                created_by: createdBy,
            });

            await logAction(
                "STATUS_LOG_ADDED",
                `Added status '${newStatus}' for candidate ${candidateName}${newNote ? ` — Note: ${newNote}` : ""}`
            );

            setNewNote("");
            setNewStatus(STATUS_OPTIONS[0]);
            setIsAdding(false);
            fetchLogs();
        } catch (err) {
            console.error("Failed to add status log:", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-violet-600" />
                    Status Timeline
                </h2>
                <button
                    onClick={() => setIsAdding(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-violet-500/20"
                >
                    {isAdding ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isAdding ? "Cancel" : "Add Status"}
                </button>
            </div>

            {/* Inline "Add Status" Form */}
            {isAdding && (
                <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Note (Optional)</label>
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add context — e.g. interview went well, waiting for visa clearance..."
                            rows={2}
                            className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={isSaving}
                        className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {isSaving ? "Saving..." : "Confirm Status"}
                    </button>
                </div>
            )}

            {/* Timeline */}
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
            ) : logs.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No status entries yet. Use "+" to log the first one.
                </p>
            ) : (
                <div className="relative space-y-1">
                    {/* Vertical line */}
                    <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-100 dark:bg-slate-800 rounded-full" />
                    {logs.map((log, index) => {
                        const cfg = getConfig(log.status_label);
                        return (
                            <div key={log.id} className="flex gap-4 relative pl-1">
                                {/* Timeline dot */}
                                <div className={`w-5 h-5 rounded-full ${cfg.dot} border-2 border-white dark:border-slate-900 shrink-0 mt-0.5 z-10 flex items-center justify-center`} />
                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.color}`}>
                                            {cfg.icon}
                                            {log.status_label}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0 mt-1 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    {log.note && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 italic pl-1">"{log.note}"</p>
                                    )}
                                    {log.created_by && (
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 pl-1">by {log.created_by}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
