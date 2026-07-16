"use client";

import React, { useEffect, useState } from "react";
import { getAgentsAndTeam, addAgent } from "@/app/actions";
import { Briefcase, Users, UserPlus, Phone, Calendar, Shield, Loader2, Plus, ChevronDown } from "lucide-react";

type Agent = { id: string; name: string; phone: string; created_at: string };
type Profile = { id: string; email: string; role: string; created_at: string };

// Added our custom country codes array
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

    // Split phone state into Country Code and the actual Number
    const [newAgentName, setNewAgentName] = useState("");
    const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
    const [newAgentPhone, setNewAgentPhone] = useState("");
    
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAgentsAndTeam();
            setAgents(data.agents as any);
            setTeam(data.team as any);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentName || !newAgentPhone) return;

        setIsAdding(true);
        setMessage({ text: "", type: "" });

        // Combine the country code and the phone number before sending to DB
        const fullPhoneNumber = `${selectedCountryCode} ${newAgentPhone.trim()}`;

        try {
            await addAgent(newAgentName, fullPhoneNumber);
            setMessage({ text: "Agent added successfully!", type: "success" });
            setNewAgentName("");
            setNewAgentPhone("");
            setSelectedCountryCode("+91"); // Reset back to default
            fetchData();
        } catch (error: any) {
            setMessage({ text: error.message || "An error occurred", type: "error" });
        }
        setIsAdding(false);
    };

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
                <button onClick={() => setActiveTab("agents")} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === "agents" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>
                    <Briefcase className="w-4 h-4" /> External Agents
                </button>
                <button onClick={() => setActiveTab("team")} className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === "team" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>
                    <Users className="w-4 h-4" /> Internal Team
                </button>
            </div>

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
                            
                            {/* NEW: Country Code + Phone Number Input Combo */}
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
                        {message.text && <div className={`mt-4 p-3 rounded-lg text-sm font-semibold ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{message.text}</div>}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Agent Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Phone Number</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Added On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {agents.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500 text-sm">No agents found.</td></tr>
                                ) : (
                                    agents.map((agent) => (
                                        <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-bold text-sm flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">{agent.name.charAt(0).toUpperCase()}</div>
                                                {agent.name}
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                {agent.phone ? <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {agent.phone}</span> : <span className="text-slate-400 italic">No phone</span>}
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm flex items-center gap-2"><Calendar className="w-3 h-3" />{new Date(agent.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Internal Team Tab Logic */}
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {team.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-sm flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black"><Users className="w-4 h-4" /></div>{member.email}</td>
                                    <td className="p-4"><span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">{member.role?.toUpperCase() || 'EMPLOYEE'}</span></td>
                                    <td className="p-4 text-slate-600 text-sm">{new Date(member.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}