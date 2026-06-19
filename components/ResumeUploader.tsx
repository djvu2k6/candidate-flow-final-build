"use client";

import React, { useState } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, Edit3, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResumeUploader() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "extracting" | "parsing" | "success" | "error" | "saving" | "saved">("idle");
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any>({});

  // Expanded F1 Data State
  const [manualData, setManualData] = useState({ 
    name: "", email: "", phone: "", role: "", 
    country: "", nationality: "", passport: "", dob: "",
    destination: "", experience: "", education: "", 
    skills: "", visaTrack: "H-1B Track", additionalInfo: ""
  });

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
      // 1. Create a proper FormData object
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // 2. Make the fetch call WITHOUT manual Content-Type headers
      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData, 
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.details || result.error);

      // 3. Update state with AI data merged into F1 structure
      setParsedData({
        name: result.fullName || "",
        email: result.email || "",
        phone: result.phone || "",
        currentRole: "",
        country: "",
        nationality: "",
        passport: "",
        dob: "",
        destination: "",
        experienceYears: result.experienceYears || 0,
        education: "",
        skills: result.skills || [],
        visaTrackRecommendation: "H-1B Track",
        additionalInfo: result.summary || ""
      });
      
      setStatus("success");
    } catch (error: any) {
      console.error("Upload failed:", error);
      setStatus("error");
    }
  };

  // Micro-Validations
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
      nationality: manualData.nationality,
      passport: manualData.passport,
      dob: manualData.dob,
      destination: manualData.destination,
      experienceYears: parseInt(manualData.experience) || 0,
      education: manualData.education,
      skills: manualData.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      visaTrackRecommendation: manualData.visaTrack,
      additionalInfo: manualData.additionalInfo
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
            nationality: parsedData.nationality,
            passport_number: parsedData.passport,
            dob: parsedData.dob || null, 
            destination_country: parsedData.destination,
            skills: parsedData.skills || [],
            experience_years: parsedData.experienceYears,
            education: parsedData.education,
            visa_track_recommendation: parsedData.visaTrackRecommendation,
            additional_info: { notes: parsedData.additionalInfo }, 
            status: "AI Parsed"
          }]);

      if (error) throw error;
      setStatus("saved");
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto border border-slate-100">
      
      <div className="flex bg-slate-100 p-1 rounded-xl mb-8 w-full max-w-[260px] mx-auto shadow-inner">
        <button onClick={() => setMode("ai")} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${mode === "ai" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          AI Parsing
        </button>
        <button onClick={() => setMode("manual")} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${mode === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Manual Entry
        </button>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">
          {mode === "ai" ? "Upload Candidate Profile" : "Manual Bio-Data Entry"}
        </h3>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {mode === "ai" ? "Gemini 1.5 will extract all F1 required fields." : "Bypass AI and enter all F1 fields directly."}
        </p>
      </div>

      {mode === "ai" ? (
        <>
          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:bg-slate-50 hover:border-slate-400 transition-all flex flex-col items-center justify-center cursor-pointer group">
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="p-4 bg-slate-900 text-white rounded-full mb-4 group-hover:scale-110 transition-transform shadow-md">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">{file ? file.name : "Click or drag PDF to upload"}</p>
          </div>

          {(status === "idle" || status === "extracting" || status === "parsing" || status === "error") && (
            <button 
              onClick={() => file && processResume(file)} 
              disabled={!file || status === "extracting" || status === "parsing"} 
              className="w-full mt-6 py-3 px-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {status === "idle" && "Extract Bio-Data"}
              {status === "extracting" && <><Loader2 className="w-4 h-4 animate-spin" /> Reading Document...</>}
              {status === "parsing" && <><Loader2 className="w-4 h-4 animate-spin" /> AI Processing F1 Fields...</>}
              {status === "error" && <><AlertCircle className="w-4 h-4" /> Processing Failed</>}
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Full Name *</label>
              <input type="text" required value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Target Role *</label>
              <input type="text" required value={manualData.role} onChange={e => setManualData({...manualData, role: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" value={manualData.email} onChange={e => setManualData({...manualData, email: e.target.value})} className={`w-full p-2.5 text-sm bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all ${validationErrors.email ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} />
              {validationErrors.email && <p className="text-[10px] text-red-600 font-bold mt-1">{validationErrors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Phone</label>
              <input type="text" value={manualData.phone} onChange={e => setManualData({...manualData, phone: e.target.value})} className={`w-full p-2.5 text-sm bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all ${validationErrors.phone ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} />
              {validationErrors.phone && <p className="text-[10px] text-red-600 font-bold mt-1">{validationErrors.phone}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Date of Birth</label>
              <input type="date" value={manualData.dob} onChange={e => setManualData({...manualData, dob: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Passport Number</label>
              <input type="text" value={manualData.passport} onChange={e => setManualData({...manualData, passport: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 uppercase transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Nationality</label>
              <input type="text" value={manualData.nationality} onChange={e => setManualData({...manualData, nationality: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Destination Country</label>
              <select value={manualData.destination} onChange={e => setManualData({...manualData, destination: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all">
                <option value="">Select Destination...</option>
                <option value="UAE">United Arab Emirates</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Qatar">Qatar</option>
                <option value="Oman">Oman</option>
                <option value="UK">United Kingdom</option>
                <option value="USA">United States</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Target Visa Track</label>
              <select value={manualData.visaTrack} onChange={e => setManualData({...manualData, visaTrack: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all">
                <option>H-1B Track</option>
                <option>L-1 Track</option>
                <option>O-1A Track</option>
                <option>EB-2 NIW</option>
                <option>General Work Permit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Years of Experience *</label>
              <input type="number" required value={manualData.experience} onChange={e => setManualData({...manualData, experience: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Skills (Comma separated)</label>
            <input type="text" placeholder="Welding, Electrical, Safety..." value={manualData.skills} onChange={e => setManualData({...manualData, skills: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Additional Info (Notes, Certs, etc.)</label>
            <textarea rows={2} placeholder="Any data that doesn't fit standard fields..." value={manualData.additionalInfo} onChange={e => setManualData({...manualData, additionalInfo: e.target.value})} className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none" />
          </div>

          <button type="submit" className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
            <Edit3 className="w-4 h-4" /> Verify & Prepare Data
          </button>
        </form>
      )}

      {(status === "success" || status === "saving" || status === "saved") && parsedData && (
        <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-slate-900" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ready for Vault</h4>
            </div>
            
            {Object.keys(validationErrors).length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Fix data before saving:</p>
                <ul className="text-[10px] text-red-600 list-disc pl-5 mt-1 font-medium">
                  {Object.values(validationErrors).map((err: any, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            <pre className="text-[10px] text-slate-600 overflow-x-auto p-3 bg-white border border-slate-200 rounded-lg shadow-inner">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>

          <button 
            onClick={handleSaveToVault}
            disabled={status === "saving" || status === "saved" || Object.keys(validationErrors).length > 0}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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