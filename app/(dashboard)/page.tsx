"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, Users, Clock, Calendar, Search, Activity, BarChart3, Plus, Loader2,
  Brain, Briefcase, Zap, CheckCircle2, Shield, UserCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import ResumeUploader from "@/components/ResumeUploader";
import CandidateTable, { Candidate } from "@/components/CandidateTable";
import { getDashboardData } from "@/app/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

type Agent = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
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
      const data = await getDashboardData();
      
      const fetchedCandidates = data.candidates || [];
      setCandidates(fetchedCandidates as any);
      setAgents(data.agents as any);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const isThisMonth = (dateString: string) => {
        const d = new Date(dateString);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      };

      setMetrics({
        docsPending: data.pendingDocsCount || 0,
        interviewsScheduled: data.scheduledInterviewsCount || 0,
        newThisMonth: fetchedCandidates.filter(c => isThisMonth(c.created_at as any)).length,
        interviewsThisMonth: (data.allInterviews || []).filter(i => isThisMonth(i.created_at as any)).length,
        placementsThisMonth: (data.allPlacements || []).filter(p => isThisMonth(p.created_at as any)).length
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
        (c.status && c.status.toLowerCase().includes(query)) ||
        (c.skills && c.skills.some(s => s.toLowerCase().includes(query)))
      );
    });
  }, [candidates, searchQuery]);

  // Derived dashboard metrics/lists
  const recentParses = useMemo(() => {
    return candidates.slice(0, 3);
  }, [candidates]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">Syncing Vault Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-sans transition-colors duration-300">
      {/* Top Header Section */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 transition-colors duration-300">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Real-time stats and applicant monitoring.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <ThemeToggle />

          <Link href="/import" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-transparent dark:border-slate-700">
            Bulk Import
          </Link>

          <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
            <DialogTrigger className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-750 transition-all shadow-sm shadow-blue-500/20 cursor-pointer flex-1 sm:flex-none">
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

      {/* Main Dashboard Space */}
      <div className="p-4 sm:p-8 max-w-[1600px] w-full mx-auto space-y-8">

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 - NOW CLICKABLE & NAVIGATES TO CANDIDATES SECTION */}
          <Link href="/candidate-section" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 duration-300 group cursor-pointer">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-700 dark:text-blue-400 shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Talent Pool</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{candidates.length}</h2>
            </div>
          </Link>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md duration-300">
            <div className={`p-4 rounded-2xl shrink-0 ${metrics.docsPending > 0 ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400'}`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Docs</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{metrics.docsPending}</h2>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md duration-300">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 text-blue-650 dark:text-blue-400 rounded-2xl shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Interviews</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{metrics.interviewsScheduled}</h2>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md duration-300">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 text-emerald-650 dark:text-emerald-400 rounded-2xl shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New This Month</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">+{metrics.newThisMonth}</h2>
            </div>
          </div>
        </div>

        {/* Dynamic Widgets and main layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Main Candidates Roster (2 Cols) */}
          <div className="xl:col-span-2 space-y-6">
            <CandidateTable candidates={filteredCandidates} onRefresh={fetchDashboardData} />
          </div>

          {/* Widgets Sidebar Column (1 Col) */}
          <div className="space-y-8">

            {/* Widget: Recent AI Parses */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent AI Parses</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Live Sync</span>
              </div>
              <div className="space-y-4">
                {recentParses.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No candidates parsed recently.</p>
                ) : (
                  recentParses.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-xl hover:border-blue-500/30 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{c.current_role || "Uncategorized"}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                        Active
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Widget: Active Agents */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Active Agency Partners</h3>
                </div>
                <Link href="/agents" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Manage
                </Link>
              </div>
              <div className="space-y-4">
                {agents.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No external agents registered yet.</p>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-xl hover:border-emerald-500/30 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{agent.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{agent.email || "No contact email"}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                        Partner
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Widget: Monthly Report & Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <BarChart3 className="w-5 h-5 text-slate-900 dark:text-white" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Monthly Pipeline</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">New Registrations</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{metrics.newThisMonth}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Interviews Held</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{metrics.interviewsThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Placements Completed</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{metrics.placementsThisMonth}</span>
                </div>
              </div>
            </div>

            {/* Widget: System Log Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <Activity className="w-5 h-5 text-slate-900 dark:text-white" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Live Activity Feed</h3>
              </div>
              <div className="space-y-5">
                <div className="flex gap-3">
                  <div className="mt-0.5 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400 h-fit shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Vault Sync Active</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Database policies successfully authenticated.</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">Just Now</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5 bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 h-fit shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">AI Parser Initialized</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Gemini models online and parsing PDF structures.</p>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">1 Minute Ago</p>
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