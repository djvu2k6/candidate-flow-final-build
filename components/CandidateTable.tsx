"use client";

import React, { useState, useMemo } from "react";
import { Download, FileText, Users, Edit } from "lucide-react"; // Added Edit icon
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import CandidateEditor from "./CandidateEditor"; // Make sure this path matches where you saved it!
import { logAction } from "@/lib/audit";

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  current_role: string;
  country: string;
  skills: string[];
  experience_years: number;
  education: string;
  visa_track_recommendation: string;
  status: string;
  created_at: string;
  gender?: string;
  nationality?: string;
  notes?: string;
}

interface CandidateTableProps {
  candidates: Candidate[];
  onRefresh?: () => void; // Added this so the parent page can refresh the data after an edit
}

export default function CandidateTable({ candidates, onRefresh }: CandidateTableProps) {
  const router = useRouter();

  // State to track which candidate is currently loaded in the slide-over panel
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("All");
  const [expFilter, setExpFilter] = useState("All");
  const [natFilter, setNatFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");

  const nationalities = useMemo(() => {
    return Array.from(new Set(candidates.map(c => (c as any).nationality).filter(Boolean))) as string[];
  }, [candidates]);

  const filteredList = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;

      if (expFilter !== "All") {
        const exp = c.experience_years || 0;
        if (expFilter === "0-2" && exp > 2) return false;
        if (expFilter === "3-5" && (exp < 3 || exp > 5)) return false;
        if (expFilter === "5+" && exp < 5) return false;
      }

      if (natFilter !== "All" && (c as any).nationality !== natFilter) return false;

      if (genderFilter !== "All" && (c.gender || "") !== genderFilter) return false;

      if (categoryFilter !== "All") {
        const skills = Array.isArray(c.skills) ? c.skills : [];
        const hasSkill = skills.some(s => s.toLowerCase().includes(categoryFilter.toLowerCase())) ||
                         (c.current_role && c.current_role.toLowerCase().includes(categoryFilter.toLowerCase()));
        if (!hasSkill) return false;
      }

      return true;
    });
  }, [candidates, statusFilter, expFilter, natFilter, categoryFilter, genderFilter]);

  const handleExportExcel = async () => {
    if (filteredList.length === 0) return;

    const exportData = filteredList.map((c) => ({
      "Full Name": c.name,
      "Gender": c.gender || "N/A",
      "Email Address": c.email || "N/A",
      "Phone Number": c.phone || "N/A",
      "Current Role": c.current_role || "N/A",
      "Years Exp": c.experience_years || 0,
      "Country": c.country || "N/A",
      "Recommended Visa": c.visa_track_recommendation || "N/A",
      "Application Status": c.status,
      "Date Added": new Date(c.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
    XLSX.writeFile(workbook, "Vault_Candidates_Export.xlsx");
    await logAction("EXCEL_EXPORT", `Exported ${filteredList.length} candidates (filtered list) to Excel`);
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px] transition-colors duration-300">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-t-2xl shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 dark:bg-slate-800 text-white dark:text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Candidate Roster</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Scroll to view all {candidates.length} records</p>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={filteredList.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-black dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Filtered
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-4 items-center shrink-0">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="AI Parsed">AI Parsed</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Visa Processing">Visa Processing</option>
              <option value="Placed">Placed / Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Experience</label>
            <select value={expFilter} onChange={(e) => setExpFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="All">All Experience</option>
              <option value="0-2">0 - 2 Years</option>
              <option value="3-5">3 - 5 Years</option>
              <option value="5+">5+ Years</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Nationality</label>
            <select value={natFilter} onChange={(e) => setNatFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="All">All Nationalities</option>
              {nationalities.map(nat => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Job Category / Skill</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="All">All Categories</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Welding">Welding</option>
              <option value="General Labour">General Labour</option>
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Gender</label>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="overflow-y-auto overflow-x-auto flex-1 w-full">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
              <tr>
                <th className="p-4 pl-6 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate Profile</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Track</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Experience</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Added</th>
                <th className="p-4 pr-6 text-right text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No matching candidates found.
                  </td>
                </tr>
              ) : (
                filteredList.map((cand) => (
                  <tr
                    key={cand.id}
                    onClick={() => router.push(`/candidate/${cand.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 pl-6 flex items-center gap-4">
                      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors shrink-0">
                        <FileText className="w-5 h-5 shrink-0" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cand.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{cand.current_role || "N/A"} &bull; {cand.country || "N/A"}</div>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-750">
                        {cand.visa_track_recommendation || "N/A"}
                      </span>
                    </td>
                    <td className="p-4 align-middle font-semibold text-slate-600 dark:text-slate-400">
                      {cand.experience_years || 0} Years
                    </td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-extrabold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                        {cand.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-slate-500 dark:text-slate-400 align-middle">
                      {new Date(cand.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 pr-6 text-right align-middle">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Stops the row click from navigating to /candidate/[id]
                          setEditingCandidate(cand);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex cursor-pointer"
                        title="Edit Candidate"
                      >
                        <Edit className="w-4 h-4 shrink-0" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Slide-Over Editor Component */}
      <CandidateEditor
        candidate={editingCandidate}
        isOpen={!!editingCandidate}
        onClose={() => setEditingCandidate(null)}
        onRefresh={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
}