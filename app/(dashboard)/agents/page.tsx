"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    getAgentsAndTeam,
    getCandidatesByAgent,
    addAgent,
    updateAgent,
    deleteAgent,
    deleteSystemUser
} from "@/app/actions";
import {
    Briefcase, Users, UserPlus, Phone, Calendar, Shield,
    Loader2, Plus, ChevronDown, Edit, Trash2, Check, X as XIcon,
    ExternalLink, Search, ArrowUpRight, UserCheck, FileText, ChevronRight
} from "lucide-react";

type Agent = {
    id: string;
    name: string;
    phone: string;
    created_at: string;
    _count?: {
        assignedCandidates: number;
        candidates: number;
    };
};
type Profile = { id: string; email: string; role: string; created_at: string };

const COUNTRY_CODES = [
    { code: "+91", flag: "🇮🇳", name: "India" },
    { code: "+972", flag: "🇮🇱", name: "Israel" },
    { code: "+971", flag: "🇦🇪", name: "UAE" },
    { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
    { code: "+974", flag: "🇶🇦", name: "Qatar" },
    { code: "+968", flag: "🇴🇲", name: "Oman" },
    { code: "+1", flag: "🇺🇸", name: "USA" },
    { code: "+44", flag: "🇬🇧", name: "UK" },
];

export default function AgentsAndTeamPage() {
    const [activeTab, setActiveTab] = useState<"agents" | "team">("agents");
    const [agents, setAgents] = useState<Agent[]>([]);
    const [team, setTeam] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Agent State
    const [newAgentName, setNewAgentName] = useState("");
    const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
    const [newAgentPhone, setNewAgentPhone] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Edit Agent State
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
    const [editAgentName, setEditAgentName] = useState("");
    const [editCountryCode, setEditCountryCode] = useState("+91");
    const [editAgentPhone, setEditAgentPhone] = useState("");

    // Modal / Slide-Over State for Candidates list under selected agent
    const [selectedAgentForModal, setSelectedAgentForModal] = useState<Agent | null>(null);
    const [agentCandidates, setAgentCandidates] = useState<any[]>([]);
    const [loadingAgentCandidates, setLoadingAgentCandidates] = useState(false);
    const [agentCandidatesSearch, setAgentCandidatesSearch] = useState("");

    const [message, setMessage] = useState({ text: "", type: "" });

    const isMountedRef = React.useRef(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAgentsAndTeam();
            if (!isMountedRef.current) return;
            setAgents(data.agents as any);
            setTeam(data.team as any);
        } catch (error) {
            console.error(error);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchData();
        return () => { isMountedRef.current = false; };
    }, []);

    // Open slide-over drawer to view candidate list of selected agent
    const openAgentCandidatesModal = async (agent: Agent) => {
        setSelectedAgentForModal(agent);
        setLoadingAgentCandidates(true);
        setAgentCandidatesSearch("");
        try {
            const candidates = await getCandidatesByAgent(agent.id);
            if (!isMountedRef.current) return;
            setAgentCandidates(candidates);
        } catch (error) {
            console.error("Failed to load agent candidates:", error);
        } finally {
            if (isMountedRef.current) setLoadingAgentCandidates(false);
        }
    };

    // --- ADD AGENT ---
    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentName || !newAgentPhone) return;

        setIsAdding(true);
        setMessage({ text: "", type: "" });
        const fullPhoneNumber = `${selectedCountryCode} ${newAgentPhone.trim()}`;

        try {
            await addAgent(newAgentName, fullPhoneNumber);
            setMessage({ text: "Agent added successfully!", type: "success" });
            setNewAgentName("");
            setNewAgentPhone("");
            setSelectedCountryCode("+91");
            fetchData();
        } catch (error: any) {
            setMessage({ text: error.message || "An error occurred", type: "error" });
        }
        setIsAdding(false);
    };

    // --- EDIT AGENT LOGIC ---
    const startEditAgent = (agent: Agent) => {
        setEditingAgentId(agent.id);
        setEditAgentName(agent.name);

        let code = "+91";
        let number = agent.phone || "";

        // Smart split for country code and phone number
        const matchedCountry = COUNTRY_CODES.find(c => agent.phone?.startsWith(c.code + " "));
        if (matchedCountry) {
            code = matchedCountry.code;
            number = agent.phone.replace(matchedCountry.code + " ", "");
        } else if (agent.phone?.includes(" ")) {
            const parts = agent.phone.split(" ");
            code = parts[0];
            number = parts.slice(1).join(" ");
        }

        setEditCountryCode(code);
        setEditAgentPhone(number);
    };

    const handleSaveEdit = async () => {
        if (!editingAgentId || !editAgentName || !editAgentPhone) return;
        const fullPhone = `${editCountryCode} ${editAgentPhone.trim()}`;

        try {
            await updateAgent(editingAgentId, editAgentName, fullPhone);
            setMessage({ text: "Agent updated successfully!", type: "success" });
            setEditingAgentId(null);
            fetchData();
        } catch (error: any) {
            setMessage({ text: error.message || "Failed to update agent.", type: "error" });
        }
    };

    // --- DELETE LOGIC ---
    const handleDeleteAgent = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to completely delete agent: ${name}?`)) return;
        try {
            await deleteAgent(id);
            setMessage({ text: "Agent deleted successfully.", type: "success" });
            fetchData();
        } catch (error: any) {
            setMessage({ text: error.message || "Failed to delete agent.", type: "error" });
        }
    };

    const handleDeleteTeamMember = async (id: string, email: string) => {
        if (!confirm(`WARNING: Are you sure you want to revoke access and delete system user: ${email}?`)) return;
        try {
            await deleteSystemUser(id);
            setMessage({ text: "System user removed successfully.", type: "success" });
            fetchData();
        } catch (error: any) {
            setMessage({ text: error.message || "Failed to remove user.", type: "error" });
        }
    };

    // Filter candidate list inside agent modal by search query
    const filteredAgentCandidates = agentCandidates.filter((c) => {
        if (!agentCandidatesSearch.trim()) return true;
        const q = agentCandidatesSearch.toLowerCase();
        return (
            c.name?.toLowerCase().includes(q) ||
            c.passport_number?.toLowerCase().includes(q) ||
            c.current_role?.toLowerCase().includes(q) ||
            c.status?.toLowerCase().includes(q)
        );
    });

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="p-8 max-w-6xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-blue-600" />
                    Directory Management
                </h1>
                <p className="text-slate-500 mt-2">Manage your external agents and view internal system users.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-px">
                <button onClick={() => setActiveTab("agents")} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === "agents" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    <Briefcase className="w-4 h-4" /> External Agents
                </button>
                <button onClick={() => setActiveTab("team")} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === "team" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    <Users className="w-4 h-4" /> Internal Team
                </button>
            </div>

            {/* Notification Bar */}
            {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-bold flex items-center justify-between ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message.text}
                    <button onClick={() => setMessage({ text: "", type: "" })}><XIcon className="w-4 h-4" /></button>
                </div>
            )}

            {activeTab === "agents" && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-600" /> Register New Agent
                        </h2>
                        <form onSubmit={handleAddAgent} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <input type="text" required placeholder="Agency Name / Agent Name *" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 text-sm" />
                            </div>

                            <div className="flex-1 flex gap-2">
                                <div className="relative w-[130px] shrink-0">
                                    <select
                                        value={selectedCountryCode}
                                        onChange={(e) => setSelectedCountryCode(e.target.value)}
                                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 text-sm appearance-none cursor-pointer"
                                    >
                                        {COUNTRY_CODES.map((country) => (
                                            <option key={country.code} value={country.code}>
                                                {country.flag} {country.code}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-500 pointer-events-none" />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    placeholder="Phone Number *"
                                    value={newAgentPhone}
                                    onChange={(e) => setNewAgentPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 text-sm"
                                />
                            </div>

                            <button type="submit" disabled={isAdding} className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm">
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Agent
                            </button>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Agent Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Candidates Sourced</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Phone Number</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Added On</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {agents.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-sm">No agents found.</td></tr>
                                ) : (
                                    agents.map((agent) => {
                                        const count = (agent._count?.assignedCandidates || 0) + (agent._count?.candidates || 0);

                                        return (
                                            <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                {editingAgentId === agent.id ? (
                                                    <>
                                                        <td className="p-3">
                                                            <input type="text" value={editAgentName} onChange={(e) => setEditAgentName(e.target.value)} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 text-sm font-semibold" autoFocus />
                                                        </td>
                                                        <td className="p-3 text-sm font-bold text-slate-400">
                                                            {count} Candidates
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex gap-1.5">
                                                                <select value={editCountryCode} onChange={(e) => setEditCountryCode(e.target.value)} className="w-[80px] px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none text-xs cursor-pointer">
                                                                    {COUNTRY_CODES.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
                                                                </select>
                                                                <input type="tel" value={editAgentPhone} onChange={(e) => setEditAgentPhone(e.target.value)} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 text-sm font-semibold" />
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-slate-500 text-sm"><Calendar className="w-3 h-3 inline mr-1" />{new Date(agent.created_at).toLocaleDateString()}</td>
                                                        <td className="p-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={handleSaveEdit} className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                                                                <button onClick={() => setEditingAgentId(null)} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"><XIcon className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => openAgentCandidatesModal(agent)}
                                                                className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-3 group/btn text-left"
                                                                title="Click to view candidate list"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
                                                                    {agent.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="group-hover/btn:underline underline-offset-4 decoration-blue-500">{agent.name}</span>
                                                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity text-blue-600 shrink-0" />
                                                            </button>
                                                        </td>
                                                        <td className="p-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => openAgentCandidatesModal(agent)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full text-xs font-black transition-colors border border-blue-200 dark:border-blue-800/60 cursor-pointer shadow-2xs"
                                                            >
                                                                <Users className="w-3.5 h-3.5" />
                                                                <span>{count} {count === 1 ? 'Candidate' : 'Candidates'}</span>
                                                            </button>
                                                        </td>
                                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                                                            {agent.phone ? <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {agent.phone}</span> : <span className="text-slate-400 italic">No phone</span>}
                                                        </td>
                                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />{new Date(agent.created_at).toLocaleDateString()}</td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => startEditAgent(agent)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Agent">
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeleteAgent(agent.id, agent.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Agent">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Internal Team Tab */}
            {activeTab === "team" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" /> System Users</h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">User Email</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {team.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 font-bold text-sm flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black"><Users className="w-4 h-4" /></div>{member.email}</td>
                                    <td className="p-4"><span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">{member.role?.toUpperCase() || 'EMPLOYEE'}</span></td>
                                    <td className="p-4 text-slate-600 text-sm">{new Date(member.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDeleteTeamMember(member.id, member.email)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SLIDE-OVER DRAWER: Candidate List for Selected Agent */}
            {selectedAgentForModal && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-md text-xs font-extrabold uppercase tracking-wider">
                                        Agent Profile
                                    </span>
                                    <span className="text-xs text-slate-400 font-semibold">
                                        {agentCandidates.length} Total Candidates
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                                    {selectedAgentForModal.name}
                                </h2>
                                {selectedAgentForModal.phone && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        {selectedAgentForModal.phone}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAgentForModal(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Toolbar inside Drawer */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter candidates by name, passport, or role..."
                                    value={agentCandidatesSearch}
                                    onChange={(e) => setAgentCandidatesSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Candidate List Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {loadingAgentCandidates ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fetching candidates...</p>
                                </div>
                            ) : filteredAgentCandidates.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No candidates found</h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {agentCandidatesSearch
                                            ? "No candidate matching your search filter."
                                            : "This agent hasn't submitted any candidate profiles yet."}
                                    </p>
                                </div>
                            ) : (
                                filteredAgentCandidates.map((c) => {
                                    const displayId = `#CCC-${c.id.toString().slice(0, 6).toUpperCase()}`;

                                    return (
                                        <div
                                            key={c.id}
                                            className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex items-center justify-between gap-4 group"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 rounded-xl shrink-0 mt-0.5">
                                                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[10px] font-bold text-slate-400">{displayId}</span>
                                                        {c.status && (
                                                            <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                {c.status}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <Link
                                                        href={`/candidate/${c.id}`}
                                                        className="font-bold text-slate-900 dark:text-white text-base hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate mt-0.5"
                                                    >
                                                        {c.name}
                                                    </Link>

                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {c.current_role && (
                                                            <span className="px-2 py-0.5 text-xs font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 rounded-md">
                                                                {c.current_role}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            Pass: {c.passport_number || "Pending"}
                                                        </span>
                                                        {c.experience_years !== null && c.experience_years !== undefined && (
                                                            <span className="text-xs text-slate-400 font-medium">
                                                                • {c.experience_years} Yrs Exp
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <Link
                                                href={`/candidate/${c.id}`}
                                                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-2xs group-hover:border-blue-600"
                                            >
                                                <span>View Profile</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}