"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
    Briefcase,
    Users,
    UserPlus,
    Mail,
    Calendar,
    Shield,
    Loader2,
    Plus
} from "lucide-react";

type Agent = { id: string; name: string; email: string; created_at: string };
type Profile = { id: string; email: string; role: string; created_at: string };

export default function AgentsAndTeamPage() {
    const [activeTab, setActiveTab] = useState<"agents" | "team">("agents");
    const [agents, setAgents] = useState<Agent[]>([]);
    const [team, setTeam] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // New Agent State
    const [newAgentName, setNewAgentName] = useState("");
    const [newAgentEmail, setNewAgentEmail] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchData = async () => {
        setLoading(true);

        // Fetch Agents
        const { data: agentsData } = await supabase
            .from("agents")
            .select("*")
            .order("created_at", { ascending: false });

        if (agentsData) setAgents(agentsData);

        // Fetch Internal Team (Profiles)
        const { data: profilesData } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (profilesData) setTeam(profilesData);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentName) return;

        setIsAdding(true);
        setMessage({ text: "", type: "" });

        const { error } = await supabase
            .from("agents")
            .insert([{ name: newAgentName, email: newAgentEmail || null }]);

        if (error) {
            setMessage({ text: error.message, type: "error" });
        } else {
            setMessage({ text: "Agent added successfully!", type: "success" });
            setNewAgentName("");
            setNewAgentEmail("");
            fetchData(); // Refresh the list
        }
        setIsAdding(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="pt-16 sm:pt-8 px-4 sm:px-8 pb-8 max-w-6xl mx-auto w-full transition-all duration-300">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    Directory Management
                </h1>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2">Manage your external agents and view internal system users.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-px">
                <button
                    onClick={() => setActiveTab("agents")}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${activeTab === "agents"
                            ? "border-blue-650 text-blue-650 dark:border-blue-500 dark:text-blue-450"
                            : "border-transparent text-slate-500 hover:text-slate-750 dark:hover:text-slate-200"
                        }`}
                >
                    <Briefcase className="w-4 h-4 shrink-0" /> External Agents
                </button>
                <button
                    onClick={() => setActiveTab("team")}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${activeTab === "team"
                            ? "border-blue-650 text-blue-650 dark:border-blue-500 dark:text-blue-455"
                            : "border-transparent text-slate-500 hover:text-slate-750 dark:hover:text-slate-200"
                        }`}
                >
                    <Users className="w-4 h-4 shrink-0" /> Internal Team
                </button>
            </div>

            {/* AGENTS TAB */}
            {activeTab === "agents" && (
                <div className="space-y-6">
                    {/* Add Agent Form */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-450" /> Register New Agent
                        </h2>
                        <form onSubmit={handleAddAgent} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    required
                                    placeholder="Agent Name / Agency Name *"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-sm transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="email"
                                    placeholder="Contact Email (Optional)"
                                    value={newAgentEmail}
                                    onChange={(e) => setNewAgentEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-sm transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
                                Add Agent
                            </button>
                        </form>
                        {message.text && (
                            <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-150 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/50'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>

                    {/* Agents List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full min-w-[600px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Agent Name</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added On</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {agents.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No agents found. Add one above!</td>
                                        </tr>
                                    ) : (
                                        agents.map((agent) => (
                                            <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="p-4 font-bold text-slate-900 dark:text-white text-sm flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                                                        {agent.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {agent.name}
                                                </td>
                                                <td className="p-4 text-slate-650 dark:text-slate-300 text-sm font-medium">
                                                    {agent.email ? (
                                                        <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> {agent.email}</span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 italic">No email</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-slate-650 dark:text-slate-350 text-sm font-medium">
                                                    <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 shrink-0" /> {new Date(agent.created_at).toLocaleDateString()}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* INTERNAL TEAM TAB */}
            {activeTab === "team" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" /> System Users
                        </h2>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">People with login access to VaultOS. Manage their accounts in Settings.</p>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full min-w-[600px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Email</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {team.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No internal users found.</td>
                                    </tr>
                                ) : (
                                    team.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white text-sm flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 flex items-center justify-center font-black">
                                                    <Users className="w-4 h-4 shrink-0" />
                                                </div>
                                                {member.email}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${member.role?.toLowerCase() === 'admin'
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50'
                                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50'
                                                    }`}>
                                                    {member.role?.toUpperCase() || 'EMPLOYEE'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-650 dark:text-slate-350 text-sm font-semibold">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}