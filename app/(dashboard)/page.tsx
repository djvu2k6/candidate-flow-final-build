"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Users, Clock, Calendar, Search, Activity, BarChart3, Plus, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import ResumeUploader from "@/components/ResumeUploader";
import CandidateTable, { Candidate } from "@/components/CandidateTable";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");

  const [metrics, setMetrics] = useState({
    docsPending: 0,
    interviewsScheduled: 0,
    newThisMonth: 0,
    interviewsThisMonth: 0,
    placementsThisMonth: 0
  });

  useEffect(() => {
    if (!isUploaderOpen) {
      fetchDashboardData();
    }
  }, [isUploaderOpen]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch everything we need for the F6 Dashboard
      const [candRes, docsRes, intRes, intAllRes, placeRes] = await Promise.all([
        supabase.from("candidates").select("*").order("created_at", { ascending: false }),
        supabase.from("documents").select("*", { count: 'exact', head: true }).eq("status", "Pending"),
        supabase.from("interviews").select("*", { count: 'exact', head: true }).eq("status", "Scheduled"),
        supabase.from("interviews").select("created_at"),
        supabase.from("placements").select("created_at")
      ]);

      if (candRes.error) throw candRes.error;
      
      const fetchedCandidates = candRes.data || [];
      setCandidates(fetchedCandidates);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Helper function to check if a date is in the current month
      const isThisMonth = (dateString: string) => {
        const d = new Date(dateString);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      };

      setMetrics({
        docsPending: docsRes.count || 0,
        interviewsScheduled: intRes.count || 0,
        newThisMonth: fetchedCandidates.filter(c => isThisMonth(c.created_at)).length,
        interviewsThisMonth: (intAllRes.data || []).filter(i => isThisMonth(i.created_at)).length,
        placementsThisMonth: (placeRes.data || []).filter(p => isThisMonth(p.created_at)).length
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const query = searchQuery.toLowerCase();
    return candidates.filter(c => {
      return (
        c.name.toLowerCase().includes(query) ||
        (c.current_role && c.current_role.toLowerCase().includes(query)) ||
        (c.visa_track_recommendation && c.visa_track_recommendation.toLowerCase().includes(query)) ||
        (c.status && c.status.toLowerCase().includes(query)) ||
        (c.skills && c.skills.some(s => s.toLowerCase().includes(query)))
      );
    });
  }, [candidates, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
          <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Syncing Enterprise Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f4f5] min-h-screen flex flex-col font-sans">
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by role, name, or skill..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>
          
          <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
            <DialogTrigger className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-black transition-colors shadow-md cursor-pointer">
              <Plus className="w-4 h-4" />
              New Candidate
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-transparent border-none shadow-none p-0">
              <DialogTitle className="sr-only">Upload Resume</DialogTitle>
              <ResumeUploader />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] w-full mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="p-4 bg-slate-900 rounded-2xl shadow-inner shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Candidates</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{candidates.length}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`p-4 rounded-2xl border shrink-0 ${metrics.docsPending > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Docs Pending</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{metrics.docsPending}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`p-4 rounded-2xl border shrink-0 ${metrics.interviewsScheduled > 0 ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Interviews</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{metrics.interviewsScheduled}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
              <BarChart3 className="w-7 h-7 text-slate-900" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">New This Month</p>
              <h2 className="text-3xl font-black text-slate-900 mt-1">+{metrics.newThisMonth}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <CandidateTable candidates={filteredCandidates} />
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-slate-900" />
                <h3 className="font-bold text-slate-900 text-lg">Monthly Report</h3>
              </div>
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <span className="text-sm font-bold text-slate-500">New Registrations</span>
                  <span className="text-base font-black text-slate-900">{metrics.newThisMonth}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <span className="text-sm font-bold text-slate-500">Interviews Held</span>
                  <span className="text-base font-black text-slate-900">{metrics.interviewsThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">Placements Completed</span>
                  <span className="text-base font-black text-slate-900">{metrics.placementsThisMonth}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-slate-900" />
                <h3 className="font-bold text-slate-900 text-lg">Activity Feed</h3>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 bg-slate-100 p-2 rounded-full h-fit">
                    <Users className="w-4 h-4 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">System Live</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">ERP Pipeline completely synced.</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">Just Now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}