"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, Edit3, Database, UserPlus, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";

export default function ResumeUploader() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "extracting" | "parsing" | "success" | "error" | "saving" | "saved">("idle");
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any>({});

  // Agent States
  const [agents, setAgents] = useState<{ id: string, name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // F1 Data State (Nationality Removed)
  const [manualData, setManualData] = useState({
    name: "", email: "", phone: "", role: "",
    country: "", passport: "", dob: "",
    destination: "", experience: "", education: "",
    skills: "", visaTrack: "H-1B Track", additionalInfo: "",
    passportExpiry: "", gender: ""
  });

  // Fetch Agents on Component Mount
  useEffect(() => {
    const fetchAgents = async () => {
      const { data, error } = await supabase.from('agents').select('id, name');
      if (data && !error) {
        setAgents(data);
      } else {
        console.error("Failed to fetch agents:", error);
      }
    };
    fetchAgents();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setParsedData(null);
    }
  };

  const processResume = async (fileToUpload: File) => {
    try {
      setStatus("parsing");
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.details || result.error);

      // Map Gemini response (Nationality removed, Documents Added)
      setParsedData({
        name: result.fullName || "",
        email: result.email || "",
        phone: result.phone || "",
        currentRole: "",
        country: "",
        passport: result.passportNumber || "",
        dob: result.dob || "",
        destination: "",
        experienceYears: result.experienceYears || 0,
        education: result.education || "",
        skills: result.skills || [],
        visaTrackRecommendation: "H-1B Track",
        additionalInfo: result.summary || "",
        passportExpiry: result.passportExpiry || "",
        documentsFound: result.documentsFound || [] // NEW
      });

      setStatus("success");
    } catch (error: any) {
      console.error("Upload failed:", error);
      setStatus("error");
    }
  };

  const validateForm = (dataToValidate: any) => {
    const errors: any = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (dataToValidate.email && !emailRegex.test(dataToValidate.email)) {
      errors.email = "Invalid email format.";
    }

    const digitsOnly = (dataToValidate.phone || "").replace(/\D/g, '');
    if (dataToValidate.phone && digitsOnly.length > 0 && digitsOnly.length < 10) {
      errors.phone = "Phone number must be at least 10 digits.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(manualData)) return;

    setParsedData({
      name: manualData.name,
      email: manualData.email,
      phone: manualData.phone,
      currentRole: manualData.role,
      country: manualData.country,
      passport: manualData.passport,
      dob: manualData.dob,
      destination: manualData.destination,
      experienceYears: parseInt(manualData.experience) || 0,
      education: manualData.education,
      skills: manualData.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      visaTrackRecommendation: manualData.visaTrack,
      additionalInfo: manualData.additionalInfo,
      passportExpiry: manualData.passportExpiry,
      gender: manualData.gender,
      documentsFound: []
    });
    setStatus("success");
  };

  const handleSaveToVault = async () => {
    if (!parsedData) return;
    if (!validateForm(parsedData)) return;

    setStatus("saving");
    try {
      const { error } = await supabase
        .from('candidates')
        .insert([{
          name: parsedData.name,
          email: parsedData.email,
          phone: parsedData.phone,
          current_role: parsedData.currentRole,
          country: parsedData.country,
          // Nationality column omitted intentionally
          passport_number: parsedData.passport,
          dob: parsedData.dob || null,
          destination_country: parsedData.destination,
          skills: parsedData.skills || [],
          experience_years: parsedData.experienceYears,
          education: parsedData.education,
          visa_track_recommendation: parsedData.visaTrackRecommendation,
          gender: parsedData.gender || null,
          additional_info: {
            notes: parsedData.additionalInfo,
            passport_expiry: parsedData.passportExpiry || null,
            documents_detected: parsedData.documentsFound || []
          },
          status: "AI Parsed",
          assigned_agent_id: selectedAgentId || null
        }]);

      if (error) throw error;
      await logAction("CANDIDATE_UPLOAD", `Uploaded candidate ${parsedData.name}`);
      setStatus("saved");
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto border border-slate-100 dark:border-slate-800 transition-colors duration-200">

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8 w-full max-w-[260px] mx-auto shadow-inner transition-colors duration-200">
        <button
          onClick={() => setMode("ai")}
          className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${mode === "ai"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
        >
          AI Parsing
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${mode === "manual"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
        >
          Manual Entry
        </button>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          {mode === "ai" ? "Upload Candidate Profile" : "Manual Bio-Data Entry"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          {mode === "ai" ? "Gemini 2.5 Flash will extract all F1 required fields." : "Bypass AI and enter all F1 fields directly."}
        </p>
      </div>

      {mode === "ai" ? (
        <>
          <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600 transition-all flex flex-col items-center justify-center cursor-pointer group">
            <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="p-4 bg-slate-900 dark:bg-blue-600 text-white rounded-full mb-4 group-hover:scale-110 transition-transform shadow-md">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{file ? file.name : "Click or drag multi-page PDF here"}</p>
          </div>

          {(status === "idle" || status === "extracting" || status === "parsing" || status === "error") && (
            <button
              onClick={() => file && processResume(file)}
              disabled={!file || status === "extracting" || status === "parsing"}
              className="w-full mt-6 py-3 px-4 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {status === "idle" && "Extract Bio-Data & Docs"}
              {status === "extracting" && <><Loader2 className="w-4 h-4 animate-spin" /> Reading Document...</>}
              {status === "parsing" && <><Loader2 className="w-4 h-4 animate-spin" /> AI Processing Data...</>}
              {status === "error" && <><AlertCircle className="w-4 h-4" /> Processing Failed</>}
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Full Name *</label>
              <input type="text" required value={manualData.name} onChange={e => setManualData({ ...manualData, name: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Target Role *</label>
              <input type="text" required value={manualData.role} onChange={e => setManualData({ ...manualData, role: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" value={manualData.email} onChange={e => setManualData({ ...manualData, email: e.target.value })} className={`w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white ${validationErrors.email ? 'border-red-500 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-800'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Phone</label>
              <input type="text" value={manualData.phone} onChange={e => setManualData({ ...manualData, phone: e.target.value })} className={`w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white ${validationErrors.phone ? 'border-red-500 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-800'}`} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Date of Birth</label>
              <input type="date" value={manualData.dob} onChange={e => setManualData({ ...manualData, dob: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Passport Number</label>
              <input type="text" value={manualData.passport} onChange={e => setManualData({ ...manualData, passport: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Passport Expiry Date</label>
              <input type="date" value={manualData.passportExpiry} onChange={e => setManualData({ ...manualData, passportExpiry: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Destination Country</label>
              <select value={manualData.destination} onChange={e => setManualData({ ...manualData, destination: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all">
                <option value="">Select Destination...</option>
                <option value="UAE">United Arab Emirates</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Israel">Israel</option>
                <option value="Qatar">Qatar</option>
                <option value="Oman">Oman</option>
                <option value="UK">United Kingdom</option>
                <option value="USA">United States</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Target Visa Track</label>
              <select value={manualData.visaTrack} onChange={e => setManualData({ ...manualData, visaTrack: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all">
                <option>H-1B Track</option>
                <option>L-1 Track</option>
                <option>O-1A Track</option>
                <option>EB-2 NIW</option>
                <option>General Work Permit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Gender</label>
              <select value={manualData.gender} onChange={e => setManualData({ ...manualData, gender: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all">
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Years of Experience *</label>
              <input type="number" required value={manualData.experience} onChange={e => setManualData({ ...manualData, experience: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Skills (Comma separated)</label>
            <input type="text" placeholder="Welding, Electrical, Safety..." value={manualData.skills} onChange={e => setManualData({ ...manualData, skills: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
          </div>

          <button type="submit" className="w-full mt-2 py-3 px-4 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <Edit3 className="w-4 h-4" /> Verify & Prepare Data
          </button>
        </form>
      )}

      {(status === "success" || status === "saving" || status === "saved") && parsedData && (
        <div className="mt-8 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          
          {/* NEW: Detected Documents Badge Section */}
          {parsedData.documentsFound && parsedData.documentsFound.length > 0 && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl mb-4">
              <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400">
                <FileText className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">AI Detected Documents</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedData.documentsFound.map((doc: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold rounded-md shadow-sm">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-slate-900 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ready for Vault</h4>
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                <p className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Fix data before saving:</p>
              </div>
            )}

            <pre className="text-[10px] text-slate-600 dark:text-slate-300 overflow-x-auto p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-inner">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>

          {/* AGENT DROPDOWN SELECTOR */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Assign to Agent
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
            >
              <option value="">-- Leave Unassigned --</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveToVault}
            disabled={status === "saving" || status === "saved" || Object.keys(validationErrors).length > 0}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {status === "success" && <><Database className="w-4 h-4" /> Confirm & Vault Data</>}
            {status === "saving" && <><Loader2 className="w-4 h-4 animate-spin" /> Committing to Database...</>}
            {status === "saved" && <><CheckCircle2 className="w-4 h-4" /> Successfully Vaulted!</>}
          </button>
        </div>
      )}
    </div>
  );
}