"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { logAction } from "@/lib/audit";
import { addPlacement, updatePlacement } from "@/app/actions";
import { Loader2, Briefcase } from "lucide-react";

interface PlacementLoggerProps {
    candidateId: string;
    candidateName: string;
    placement?: any; // If provided, we are in Edit mode
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function PlacementLogger({
    candidateId,
    candidateName,
    placement,
    isOpen,
    onClose,
    onRefresh
}: PlacementLoggerProps) {
    const [employerName, setEmployerName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [destinationCountry, setDestinationCountry] = useState("UAE");
    const [startDate, setStartDate] = useState("");
    const [contractDuration, setContractDuration] = useState("24");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (placement) {
            setEmployerName(placement.employer_name || "");
            setJobTitle(placement.job_title || "");
            setDestinationCountry(placement.destination_country || "UAE");
            setStartDate(placement.start_date || "");
            setContractDuration(placement.contract_duration_months?.toString() || "24");
        } else {
            setEmployerName("");
            setJobTitle("");
            setDestinationCountry("UAE");
            setStartDate("");
            setContractDuration("24");
        }
    }, [placement, isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employerName || !jobTitle || !startDate) return;

        setIsSaving(true);
        try {
            if (placement) {
                // Edit mode
                await updatePlacement(placement.id, {
                    employer_name: employerName,
                    job_title: jobTitle,
                    destination_country: destinationCountry,
                    start_date: startDate,
                    contract_duration_months: parseInt(contractDuration) || 24
                });
                await logAction(
                    "PLACEMENT_EDIT",
                    `Updated placement details at ${employerName} for candidate ${candidateName}`
                );
            } else {
                // Add mode
                await addPlacement({
                    candidate_id: candidateId,
                    employer_name: employerName,
                    job_title: jobTitle,
                    destination_country: destinationCountry,
                    start_date: startDate,
                    contract_duration_months: parseInt(contractDuration) || 24
                });

                await logAction(
                    "PLACEMENT_LOGGED",
                    `Logged job placement at ${employerName} as '${jobTitle}' for candidate ${candidateName} (Auto set status to Placed)`
                );
            }
            onRefresh();
            onClose();
        } catch (error) {
            console.error("Failed to save placement:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 text-slate-900 dark:text-white">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-emerald-600" />
                        {placement ? "Edit Placement Log" : "Log Candidate Placement"}
                    </DialogTitle>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                        Candidate: {candidateName}
                    </p>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Employer Name</label>
                            <input
                                required
                                type="text"
                                value={employerName}
                                onChange={(e) => setEmployerName(e.target.value)}
                                placeholder="e.g. Tesla Energy"
                                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Job Title</label>
                            <input
                                required
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g. General Plumber"
                                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Destination Country</label>
                            <select
                                value={destinationCountry}
                                onChange={(e) => setDestinationCountry(e.target.value)}
                                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                            >
                                <option value="UAE">United Arab Emirates</option>
                                <option value="Saudi Arabia">Saudi Arabia</option>
                                <option value="Qatar">Qatar</option>
                                <option value="Oman">Oman</option>
                                <option value="UK">United Kingdom</option>
                                <option value="USA">United States</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Contract Duration (Months)</label>
                            <input
                                required
                                type="number"
                                value={contractDuration}
                                onChange={(e) => setContractDuration(e.target.value)}
                                placeholder="e.g. 24"
                                className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider">Start Date</label>
                        <input
                            required
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
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
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Log Placement"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
