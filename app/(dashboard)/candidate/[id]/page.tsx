"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, User, Briefcase, FileText, MapPin, Edit, Download, ShieldCheck, Camera, Loader2, Mail, Phone, Calendar, Fingerprint, ShieldAlert, Users, StickyNote, Trash2, Home, AlertTriangle, UserPlus, Shield } from "lucide-react";
import CandidateEditor from "@/components/CandidateEditor";
import CandidateStatusLog from "@/components/CandidateStatusLog";
import { logAction } from "@/lib/audit";
import InterviewScheduler from "@/components/InterviewScheduler";
import PlacementLogger from "@/components/PlacementLogger";

// Helper function to calculate exact age dynamically
const calculateAge = (dobString: string) => {
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

const getPassportStatus = (expiryDateStr?: string) => {
  if (!expiryDateStr) return { label: "No Date Recorded", color: "text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" };
  const expiryDate = new Date(expiryDateStr);
  const now = new Date();
  if (expiryDate < now) {
    return { label: "Expired", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50" };
  }
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(now.getMonth() + 6);
  if (expiryDate < sixMonthsFromNow) {
    return { label: "Expiring Soon", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50" };
  }
  return { label: "Active & Valid", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-850" };
};

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [placement, setPlacement] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // NEW: Store current user's role to lock down the Delete button
  const [currentUserRole, setCurrentUserRole] = useState<string>("staff");

  // Dialog states
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [isPlacementOpen, setIsPlacementOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchEverything();
  }, [candidateId]);

  const fetchEverything = async () => {
    setLoading(true);

    // 1. Fetch current user role for permissions
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profileData) {
        setCurrentUserRole(profileData.role?.toLowerCase() || "staff");
      }
    }

    const { data: candData } = await supabase.from("candidates").select("*").eq("id", candidateId).single();
    setCandidate(candData);

    const { data: docsData } = await supabase.from("documents").select("*").eq("candidate_id", candidateId).order("created_at", { ascending: false });
    if (docsData) setDocuments(docsData);

    const { data: intData } = await supabase.from("interviews").select("*").eq("candidate_id", candidateId).order("interview_date", { ascending: true });
    if (intData) setInterviews(intData);

    const { data: placeData } = await supabase.from("placements").select("*").eq("candidate_id", candidateId).maybeSingle();
    setPlacement(placeData);

    const { data: agentsData } = await supabase.from("agents").select("id, name, phone");
    if (agentsData) setAgents(agentsData);

    const { data: staffData } = await supabase.from("profiles").select("id, email");
    if (staffData) setStaff(staffData);

    setLoading(false);
  };

  const handleAssignAgent = async (agentId: string) => {
    const dbAgentId = agentId === "" ? null : agentId;
    const { error } = await supabase.from("candidates").update({ assigned_agent_id: dbAgentId }).eq("id", candidateId);
    if (error) {
      alert(`Database Error: ${error.message}`);
      return;
    }
    const agent = agents.find(a => a.id === agentId);
    await logAction("CANDIDATE_EDIT", `Assigned candidate ${candidate.name} to agent ${agent?.name || 'Unassigned'}`);
    fetchEverything();
  };

  const handleAssignStaff = async (staffId: string) => {
    const dbStaffId = staffId === "" ? null : staffId;
    const { error } = await supabase.from("candidates").update({ assigned_staff_id: dbStaffId }).eq("id", candidateId);
    if (error) {
      alert(`Database Error: ${error.message}`);
      return;
    }
    const member = staff.find(s => s.id === staffId);
    await logAction("CANDIDATE_EDIT", `Assigned candidate ${candidate.name} to staff ${member?.email || 'Unassigned'}`);
    fetchEverything();
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("candidates").update({ status: newStatus }).eq("id", candidateId);
    await logAction("CANDIDATE_EDIT", `Updated placement status of candidate ${candidate.name} to '${newStatus}'`);
    fetchEverything();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !candidate) return;

    setIsUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${candidateId}/avatar_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("candidates").update({ avatar_url: publicUrlData.publicUrl }).eq("id", candidateId);
      fetchEverything();
    }
    setIsUploadingAvatar(false);
  };

  const handleDeleteCandidate = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${candidate.name}? This cannot be undone.`)) return;

    await supabase.from("documents").delete().eq("candidate_id", candidateId);
    await supabase.from("interviews").delete().eq("candidate_id", candidateId);
    await supabase.from("placements").delete().eq("candidate_id", candidateId);
    await supabase.from("candidates").delete().eq("id", candidateId);
    await logAction("CANDIDATE_DELETE", `Deleted candidate ${candidate.name} (ID: ${candidateId})`);

    router.push("/candidate-section");
  };

  const handleGeneratePDF = async () => {
    window.print();
    await logAction("PDF_DOWNLOAD", `Printed/Generated PDF Bio-Data for candidate ${candidate.name}`);
  };

  if (loading) return <div className="p-8 text-slate-500 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading Profile...</div>;
  if (!candidate) return <div className="p-8 text-red-500">Candidate not found.</div>;

  // BRANDING LOGIC & AGE CALCULATION
  const displayId = `#CCC-${candidate.id.toString().slice(0, 6).toUpperCase()}`;
  const age = candidate.dob ? calculateAge(candidate.dob) : null;
  const isAgeWarning = age !== null && (age < 25 || age > 44);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0">
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer">
              <label className="cursor-pointer block relative">
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                {candidate.avatar_url ? (
                  <img src={candidate.avatar_url} alt={candidate.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800" />
                ) : (
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-transparent">
                    {candidate.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
              </label>
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                {candidate.name}
                <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-mono uppercase tracking-wider align-middle">
                  {displayId}
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {candidate.current_role}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {candidate.destination_country || candidate.country || "Unspecified"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
              <Edit className="w-4 h-4" /> Edit Profile
            </button>
            <button onClick={handleGeneratePDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20">
              <Download className="w-4 h-4" /> Generate PDF
            </button>

            {/* ONLY ADMINS CAN SEE THE DELETE BUTTON */}
            {currentUserRole === 'admin' && (
              <button onClick={handleDeleteCandidate} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all shadow-sm shadow-rose-600/20">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:grid-cols-1 print:gap-4 print:w-full">

        {/* Core Profile Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit print:border-none print:shadow-none print:p-0 print:block">

          <div className="hidden print:flex print:items-center print:gap-4 print:mb-8 print:border-b print:pb-6 print:border-slate-200">
            {candidate.avatar_url && (
              <img src={candidate.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-4xl font-black text-black">{candidate.name} <span className="text-xl text-slate-500 font-mono ml-2">({displayId})</span></h1>
              <p className="text-lg text-slate-600">{candidate.current_role}</p>
              <p className="text-sm text-slate-400 mt-1">{candidate.email} | {candidate.phone}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 print:text-black">
            <User className="w-5 h-5 text-blue-600 print:text-black" /> Candidate Details
          </h2>

          <div className="space-y-5 print:space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{candidate.email || "No Email Provided"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{candidate.phone || "No Phone Provided"}</p>
            </div>

            {/* REMOVED NATIONALITY, ADDED ADDRESS */}
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Address</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-relaxed">{candidate.address || "Not Recorded"}</p>
            </div>

            {/* AGE CALCULATION DISPLAY */}
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date of Birth</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {candidate.dob ? new Date(candidate.dob).toLocaleDateString(undefined, { dateStyle: 'long' }) : "No DOB Provided"}
                </p>
                {age !== null && (
                  <span className={`px-2 py-0.5 text-xs rounded-md font-bold flex items-center gap-1 ${isAgeWarning ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {isAgeWarning && <AlertTriangle className="w-3 h-3" />}
                    {age} yrs
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Gender</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{candidate.gender || "Not Recorded"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Experience</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{candidate.experience_years} Years</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">Verified Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(candidate.skills) && candidate.skills.length > 0 ? candidate.skills.map((skill: string) => (
                  <span key={skill} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 print:text-black print:border-slate-350 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800">
                    {skill}
                  </span>
                )) : <span className="text-xs text-slate-400 font-medium italic">No skills listed</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Highlighted Passport & Placement Details */}
        <div className="space-y-8 print:block">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md h-fit relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 print:text-black">
              <Fingerprint className="w-5 h-5 text-blue-600 print:text-black" /> Passport Verification
            </h2>

            <div className="space-y-6">
              <div className="p-4 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-900 rounded-xl shadow-inner">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">Passport Status</p>
                {(() => {
                  const expiryVal = candidate.additional_info?.passport_expiry || candidate.passport_expiry;
                  const status = getPassportStatus(expiryVal);
                  return (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border ${status.color} mt-1`}>
                      {status.label === "Expired" && <ShieldAlert className="w-3.5 h-3.5" />}
                      {status.label}
                    </div>
                  );
                })()}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Passport Number</p>
                <p className="font-mono text-xl font-bold tracking-widest text-slate-900 dark:text-white mt-1 uppercase">
                  {candidate.passport_number || "NOT RECORDED"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Passport Expiry Date</p>
                <p className="text-base font-semibold text-slate-850 dark:text-slate-100 mt-1">
                  {(() => {
                    const expiryVal = candidate.additional_info?.passport_expiry || candidate.passport_expiry;
                    return expiryVal ? new Date(expiryVal).toLocaleDateString(undefined, { dateStyle: 'long' }) : <span className="text-slate-400 italic">Not Recorded</span>;
                  })()}
                </p>
              </div>
            </div>
          </div>

          {candidate.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-600" /> Staff Notes
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{candidate.notes}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-650" /> Placement Details
            </h2>
            {placement ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Employer</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{placement.employer_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Job Title</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{placement.job_title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Country</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{placement.destination_country}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Duration</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{placement.contract_duration_months} Months</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Start Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {new Date(placement.start_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </p>
                </div>
                <button onClick={() => setIsPlacementOpen(true)} className="w-full mt-2 py-2 text-xs font-bold text-slate-650 dark:text-slate-350 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors">
                  Edit Placement Logs
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-slate-505 dark:text-slate-400 italic">No job placement logged yet.</p>
                <button onClick={() => setIsPlacementOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-705 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20">
                  Log Placement
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Pipeline & Document Vault & Interviews */}
        <div className="space-y-8 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Pipeline & Assignment
            </h2>
            <div className="space-y-6">

              {/* AGENT ASSIGNMENT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-blue-500" /> Source Agent
                </label>
                <select
                  value={candidate.assigned_agent_id || ""}
                  onChange={(e) => handleAssignAgent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all"
                >
                  <option value="">-- Direct / Unassigned --</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}{agent.phone ? ` (${agent.phone})` : ''}</option>
                  ))}
                </select>
                {candidate.assigned_agent_id && (
                  <p className="text-[10px] text-blue-500 font-bold mt-1.5 flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    {agents.find(a => a.id === candidate.assigned_agent_id)?.name || 'Agent'} is currently assigned
                  </p>
                )}
              </div>

              {/* STAFF ASSIGNMENT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" /> Internal Staff
                </label>
                <select
                  value={candidate.assigned_staff_id || ""}
                  onChange={(e) => handleAssignStaff(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600/50 outline-none transition-all"
                >
                  <option value="">-- Unassigned --</option>
                  {staff.map(member => (
                    <option key={member.id} value={member.id}>{member.email}</option>
                  ))}
                </select>
                {candidate.assigned_staff_id && (
                  <p className="text-[10px] text-emerald-500 font-bold mt-1.5 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {staff.find(s => s.id === candidate.assigned_staff_id)?.email || 'Staff'} is currently assigned
                  </p>
                )}
              </div>

              {/* STATUS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Placement Status</label>
                <select value={candidate.status || "Pending"} onChange={(e) => handleStatusChange(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all">
                  <option value="Pending">Pending Review</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Visa Processing">Visa Processing</option>
                  <option value="Placed">Placed / Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" /> Document Vault
            </h2>
            <div className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No documents uploaded yet.
                </p>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-850 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate pr-4 block">
                        {doc.title}
                      </span>
                      <span className={`inline-block px-1.5 py-0.5 text-[8px] font-extrabold rounded border mt-1 ${doc.status === "Verified" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 border-emerald-100" : doc.status === "Expired" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border-rose-100" : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 border-amber-100"}`}>
                        {doc.status || "Uploaded"}
                      </span>
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                      View
                    </a>
                  </div>
                ))
              )}
              <button onClick={() => setIsEditing(true)} className="w-full mt-4 py-2 text-xs font-bold text-slate-650 dark:text-slate-350 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl transition-colors">
                Open Vault Manager
              </button>
            </div>
          </div>

          <CandidateStatusLog candidateId={candidateId} candidateName={candidate.name} />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-650" /> Interviews
              </h2>
              <button onClick={() => { setSelectedInterview(null); setIsInterviewOpen(true); }} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-100 dark:border-blue-900/50">
                Schedule
              </button>
            </div>
            <div className="space-y-3">
              {interviews.length === 0 ? (
                <p className="text-xs text-slate-550 text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No interviews scheduled.
                </p>
              ) : (
                interviews.map(int => (
                  <div key={int.id} className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-100">{int.interview_type}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded border ${int.status === "Passed" ? "bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100" : int.status === "Failed" ? "bg-rose-50 text-rose-650 dark:bg-rose-950/20 dark:text-rose-450 border-rose-100" : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100"}`}>
                        {int.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{new Date(int.interview_date).toLocaleString()}</p>
                    {int.notes && <p className="text-[10px] text-slate-650 dark:text-slate-350 border-t border-slate-150 dark:border-slate-900 pt-1 italic font-medium">"{int.notes}"</p>}
                    <div className="flex justify-end pt-1">
                      <button onClick={() => { setSelectedInterview(int); setIsInterviewOpen(true); }} className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        Reschedule / Update
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <CandidateEditor candidate={candidate} isOpen={isEditing} onClose={() => setIsEditing(false)} onRefresh={fetchEverything} />

      <InterviewScheduler
        isOpen={isInterviewOpen}
        onClose={() => { setIsInterviewOpen(false); setSelectedInterview(null); }}
        candidateId={candidateId}
        candidateName={candidate.name}
        interview={selectedInterview}
        onRefresh={fetchEverything}
      />

      <PlacementLogger
        isOpen={isPlacementOpen}
        onClose={() => setIsPlacementOpen(false)}
        candidateId={candidateId}
        candidateName={candidate.name}
        placement={placement}
        onRefresh={fetchEverything}
      />
    </div>
  );
}