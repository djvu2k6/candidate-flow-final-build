"use client";

import React from "react";
import { Download, FileText, Users } from "lucide-react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

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
}

interface CandidateTableProps {
  candidates: Candidate[];
}

export default function CandidateTable({ candidates }: CandidateTableProps) {
  const router = useRouter(); 
  
  const handleExportExcel = () => {
    if (candidates.length === 0) return;

    const exportData = candidates.map((c) => ({
      "Full Name": c.name,
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
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
      {/* Table Header & Export */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Candidate Roster</h3>
            <p className="text-xs text-slate-500 font-medium">Scroll to view all {candidates.length} records</p>
          </div>
        </div>
        
        <button
          onClick={handleExportExcel}
          disabled={candidates.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-black disabled:bg-slate-300 transition-colors shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* The Scrollable Grid */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-sm">
            <tr className="hover:bg-slate-50 transition-colors">
              <th className="p-4 pl-6">Candidate Profile</th>
              <th className="p-4">Target Track</th>
              <th className="p-4">Experience</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right pr-6">Date Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No candidates in the vault yet.
                </td>
              </tr>
            ) : (
              candidates.map((cand) => (
                <tr 
                  key={cand.id} 
                  onClick={() => router.push(`/candidate/${cand.id}`)}
                  className="hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <td className="p-4 pl-6 flex items-center gap-4">
                    <div className="p-2.5 bg-slate-100 group-hover:bg-white border border-slate-200 text-slate-700 rounded-xl transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">{cand.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{cand.current_role} &bull; {cand.country}</div>
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {cand.visa_track_recommendation}
                    </span>
                  </td>
                  <td className="p-4 align-middle font-medium text-slate-600">
                    {cand.experience_years} Years
                  </td>
                  <td className="p-4 align-middle">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-slate-900 text-white">
                      {cand.status}
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6 text-sm font-medium text-slate-500 align-middle">
                    {new Date(cand.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}