"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Download, FileText, Users, Edit, AlertTriangle, Search, UserPlus, Shield } from "lucide-react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import CandidateEditor from "./CandidateEditor";
import { logAction } from "@/lib/audit";
import { supabase } from "@/lib/supabase";

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
  status: string;
  created_at: string;
  gender?: string;
  notes?: string;
  dob?: string;
  passport_number?: string;
  assigned_agent_id?: string;
  assigned_staff_id?: string;
}

interface CandidateTableProps {
  candidates: Candidate[];
  onRefresh?: () => void;
}

// Dynamic age calculator
const calculateAge = (dobString?: string) => {
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

export default function CandidateTable({ candidates, onRefresh }: CandidateTableProps) {
  const router = useRouter();

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Dependency States
  const [jobCategories, setJobCategories] = useState<any[]>([]);
  const [agentsMap, setAgentsMap] = useState<Record<string, string>>({});
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expFilter, setExpFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");

  useEffect(() => {
    const fetchDependencies = async () => {
      const { data: jobs } = await supabase.from("job_categories").select("id, name").order("name");
      if (jobs) setJobCategories(jobs);

      const { data: agents } = await supabase.from("agents").select("id, name");
      if (agents) {
        const aMap: Record<string, string> = {};
        agents.forEach(a => aMap[a.id] = a.name);
        setAgentsMap(aMap);
      }

      const { data: staff } = await supabase.from("profiles").select("id, email");
      if (staff) {
        const sMap: Record<string, string> = {};
        staff.forEach(s => sMap[s.id] = s.email);
        setStaffMap(sMap);
      }
    };
    fetchDependencies();
  }, []);

  const filteredList = useMemo(() => {
    return candidates.filter((c) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          c.name.toLowerCase().includes(q) ||
          (c.passport_number && c.passport_number.toLowerCase().includes(q)) ||
          (c.current_role && c.current_role.toLowerCase().includes(q)) ||
          (c.skills && c.skills.some(s => s.toLowerCase().includes(q)));

        if (!matchesSearch) return false;
      }

      if (statusFilter !== "All" && c.status !== statusFilter) return false;

      if (expFilter !== "All") {
        const exp = c.experience_years || 0;
        if (expFilter === "0-2" && exp > 2) return false;
        if (expFilter === "3-5" && (exp < 3 || exp > 5)) return false;
        if (expFilter === "5+" && exp < 5) return false;
      }

      if (genderFilter !== "All" && (c.gender || "") !== genderFilter) return false;

      if (categoryFilter !== "All") {
        const matchesCategory = c.current_role && c.current_role.toLowerCase() === categoryFilter.toLowerCase();
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [candidates, searchQuery, statusFilter, expFilter, categoryFilter, genderFilter]);

  const handleExportExcel = async () => {
    if (filteredList.length === 0) return;

    const exportData = filteredList.map((c) => ({
      "Full Name": c.name,
      "Age": c.dob ? calculateAge(c.dob) : "N/A",
      "Gender": c.gender || "N/A",
      "Email Address": c.email || "N/A",
      "Phone Number": c.phone || "N/A",
      "Target Job Category": c.current_role || "Uncategorized",
      "Years Exp": c.experience_years || 0,
      "Passport Number": c.passport_number || "N/A",
      "Source Agent": c.assigned_agent_id ? agentsMap[c.assigned_agent_id] || "Unknown" : "Direct / None",
      "Assigned Staff": c.assigned_staff_id ? staffMap[c.assigned_staff_id] || "Unknown" : "Unassigned",
      "Application Status": c.status,
      "Date Added": new Date(c.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
    XLSX.writeFile(workbook, "Clockwise_Candidates_Export.xlsx");
    await logAction("EXCEL_EXPORT", `Exported ${filteredList.length} candidates to Excel`);
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[700px] transition-colors duration-300">

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

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-4 shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by Name, Passport, Target Job, or Skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Visa Processing">Visa Processing</option>
                <option value="Placed">Placed / Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Experience</label>
              <select value={expFilter} onChange={(e) => setExpFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Experience</option>
                <option value="0-2">0 - 2 Years</option>
                <option value="3-5">3 - 5 Years</option>
                <option value="5+">5+ Years</option>
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Target Job</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Categories</option>
                {jobCategories.map(job => (
                  <option key={job.id} value={job.name}>{job.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Gender</label>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full p-2 text-xs bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto overflow-x-auto flex-1 w-full">
          <table className="w-full min-w-[1100px] text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
              <tr>
                <th className="p-4 pl-6 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate Profile</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Job</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passport</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Agent</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Internal Staff</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-4 pr-6 text-right text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No matching candidates found.
                  </td>
                </tr>
              ) : (
                filteredList.map((cand) => {
                  const age = cand.dob ? calculateAge(cand.dob) : null;
                  const isAgeWarning = age !== null && (age < 25 || age > 44);

                  const agentName = cand.assigned_agent_id ? agentsMap[cand.assigned_agent_id] : null;
                  const staffEmail = cand.assigned_staff_id ? staffMap[cand.assigned_staff_id] : null;

                  return (
                    <tr
                      key={cand.id}
                      onClick={() => router.push(`/candidate/${cand.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 pl-6 flex items-start gap-4">
                        <div className="mt-1 p-2.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors shrink-0">
                          <FileText className="w-5 h-5 shrink-0" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cand.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {cand.experience_years || 0} Yrs Exp
                            </span>

                            {/* THE NEW STACKED AGE BADGE */}
                            {age !== null ? (
                              <span className={`px-2 py-0.5 text-[10px] rounded-md font-black flex items-center gap-1 w-fit ${isAgeWarning ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50 shadow-sm shadow-red-500/10' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                {isAgeWarning && <AlertTriangle className="w-3 h-3" />}
                                {age} YRS OLD
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] rounded-md font-black flex items-center gap-1 w-fit bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                                AGE N/A
                              </span>
                            )}

                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                          {cand.current_role || "Uncategorized"}
                        </span>
                      </td>
                      <td className="p-4 align-middle font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        {cand.passport_number || "PENDING"}
                      </td>

                      <td className="p-4 align-middle">
                        {agentName ? (
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{agentName}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct</span>
                        )}
                      </td>

                      <td className="p-4 align-middle">
                        {staffEmail ? (
                          <div className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={staffEmail}>
                              {staffEmail.split('@')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unassigned</span>
                        )}
                      </td>

                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-extrabold border ${cand.status === "Placed" ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50" : "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50"}`}>
                          {cand.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right align-middle">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCandidate(cand);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors inline-flex cursor-pointer"
                          title="Edit Candidate"
                        >
                          <Edit className="w-4 h-4 shrink-0" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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