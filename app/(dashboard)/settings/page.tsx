"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f4f4f5] min-h-screen font-sans pb-12">
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-20">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" /> System Security & Audit Logs
        </h1>
      </div>

      <div className="p-8 max-w-5xl mx-auto mt-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <Activity className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900">Recent Activity (Last 50 Actions)</h3>
          </div>
          
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Timestamp</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action Taken</th>
                  <th className="p-4 pr-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">No activity logged yet.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-4 pl-6 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-900">{log.user_name}</td>
                      <td className="p-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">{log.action}</span></td>
                      <td className="p-4 pr-6 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}