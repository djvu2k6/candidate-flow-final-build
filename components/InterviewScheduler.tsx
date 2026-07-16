"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { logAction } from "@/lib/audit";
import { addInterview, updateInterview } from "@/app/actions";
import { Loader2, Calendar } from "lucide-react";

interface InterviewSchedulerProps {
    candidateId: string;
    candidateName: string;
    interview?: any; // If provided, we are in Edit mode
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function InterviewScheduler({
    candidateId,
    candidateName,
    interview,
    isOpen,
    onClose,
    onRefresh
}: InterviewSchedulerProps) {
    const [interviewDate, setInterviewDate] = useState("");
    const [interviewType, setInterviewType] = useState("HR Screening");
    const [status, setStatus] = useState("Scheduled");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (interview) {
            // Format ISO timestamp to datetime-local string (YYYY-MM-DDTHH:MM)
            const dateObj = new Date(interview.interview_date);
            const offset = dateObj.getTimezoneOffset();
            const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
            const dateStr = localDate.toISOString().slice(0, 16);
            
            setInterviewDate(dateStr);
            setInterviewType(interview.interview_type || "HR Screening");
            setStatus(interview.status || "Scheduled");
            setNotes(interview.notes || "");
        } else {
            setInterviewDate("");
            setInterviewType("HR Screening");
            setStatus("Scheduled");
            setNotes("");
        }
    }, [interview, isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!interviewDate) return;

        setIsSaving(true);
        try {
            const formattedDate = new Date(interviewDate).toISOString();

            if (interview) {
                // Edit mode
                await updateInterview(interview.id, {
                    interview_date: formattedDate,
                    interview_type: interviewType,
                    status: status,
                    notes: notes
                });
                await logAction(
                    "INTERVIEW_EDIT",
                    `Updated interview (${interviewType}) to status '${status}' for candidate ${candidateName}`
                );
            } else {
                // Add mode
                await addInterview({
                    candidate_id: candidateId,
                    interview_date: formattedDate,
                    interview_type: interviewType,
                    status: status,
                    notes: notes
                });
                await logAction(
                    "INTERVIEW_SCHEDULED",
                    `Scheduled a new interview (${interviewType}) on ${new Date(interviewDate).toLocaleString()} for candidate ${candidateName}`
                );
            }
            onRefresh();
            onClose();
        } catch (error) {
            console.error("Failed to save interview:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 text-slate-900 dark:text-white">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {interview ? "Reschedule Interview" : "Schedule Interview"}
                    </DialogTitle>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        Candidate: {candidateName}
                    </p>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Date & Time</label>
                        <input
                            required
                            type="datetime-local"
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                            className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Interview Type</label>
                            <select
                                value={interviewType}
                                onChange={(e) => setInterviewType(e.target.value)}
                                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                            >
                                <option value="HR Screening">HR Screening</option>
                                <option value="Technical Round">Technical Round</option>
                                <option value="Management Round">Management Round</option>
                                <option value="Client Interview">Client Interview</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Passed">Passed</option>
                                <option value="Failed">Failed</option>
                                <option value="Deferred">Deferred</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Interviewer Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add interview outcome, observations, or next steps..."
                            rows={3}
                            className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all resize-none"
                        />
                    </div>

                    <DialogFooter className="pt-2 gap-2 flex flex-row justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Schedule"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
