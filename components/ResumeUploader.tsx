"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, Edit3, Database, UserPlus, FileText, Shield, Plus, X, AlertTriangle, Search, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";


// Helper function to dynamically calculate age
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

export default function ResumeUploader() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "extracting" | "parsing" | "success" | "error" | "saving" | "saved">("idle");
  const [parsedData, setParsedData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any>({});



  // Dropdown States
  const [agents, setAgents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [jobCategories, setJobCategories] = useState<any[]>([]);
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const jobDropdownRef = useRef<HTMLDivElement>(null);

  // Assignment States
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedJobCategory, setSelectedJobCategory] = useState<string>("");

  // Inline "Add New Category" States
  const [isAddingNewJob, setIsAddingNewJob] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const [jobError, setJobError] = useState("");

  const [manualData, setManualData] = useState({
    name: "", email: "", phone: "", address: "",
    passport: "", dob: "", destination: "",
    experience: "", education: "", skills: "",
    additionalInfo: "", passportExpiry: "", gender: ""
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      const { data: agentsData } = await supabase.from('agents').select('id, name');
      if (agentsData) setAgents(agentsData);

      const { data: staffData } = await supabase.from('profiles').select('id, email');
      if (staffData) setStaff(staffData);

      const { data: jobData } = await supabase.from('job_categories').select('id, name').order('name');
      if (jobData) setJobCategories(jobData);
    };
    fetchDependencies();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(event.target as Node)) {
        setIsJobDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setParsedData(null);
    }
  };
  const filteredJobCategories = useMemo(() => {
    if (!jobSearchQuery.trim()) return jobCategories;
    return jobCategories.filter(job =>
      job.name.toLowerCase().includes(jobSearchQuery.toLowerCase())
    );
  }, [jobCategories, jobSearchQuery]);

  const selectedJobObj = jobCategories.find(
    j => String(j.id) === String(selectedJobCategory) || j.id === selectedJobCategory
  );
  const selectedJobName = selectedJobObj ? selectedJobObj.name : "-- Select Category --";

  const processResume = async (fileToUpload: File) => {
    try {
      setStatus("parsing");
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/parse', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.details || result.error);

      setParsedData({
        name: result.fullName || "",
        email: result.email || "",
        phone: result.phone || "",
        address: result.address || "",
        passport: result.passportNumber || "",
        dob: result.dob || "",
        destination: "",
        experienceYears: result.experienceYears || "",
        education: result.education || "",
        skills: result.skills || [],
        additionalInfo: result.summary || "",
        passportExpiry: result.passportExpiry || "",
        gender: result.gender || "",
        documentsFound: result.documentsFound || []
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
    if (mode === "manual" && !selectedJobCategory) {
      errors.jobCategory = "Job Category is required.";
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
      address: manualData.address,
      passport: manualData.passport,
      dob: manualData.dob,
      destination: manualData.destination,
      experienceYears: manualData.experience,
      skills: manualData.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      additionalInfo: manualData.additionalInfo,
      passportExpiry: manualData.passportExpiry,
      gender: manualData.gender,
      documentsFound: []
    });
    setStatus("success");
  };

  const saveNewJobCategory = async () => {
    const trimmedName = newJobName.trim();
    if (!trimmedName) {
      setJobError("Category name cannot be empty.");
      return;
    }

    const exists = jobCategories.some(job => job.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setJobError("This category already exists.");
      return;
    }
    setJobError("");

    try {
      const { data, error } = await supabase
        .from('job_categories')
        .insert([{ name: trimmedName }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setJobCategories(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedJobCategory(data[0].id);
        setNewJobName("");
        setIsAddingNewJob(false);
      }
    } catch (err: any) {
      setJobError(`Database Error: ${err.message}`);
    }
  };

  const handleSaveToVault = async () => {
    if (!parsedData || !validateForm(parsedData)) return;
    setStatus("saving");

    try {
      const selectedJob = jobCategories.find(j => j.id === selectedJobCategory);

      const { error } = await supabase
        .from('candidates')
        .insert([{
          name: parsedData.name,
          email: parsedData.email,
          phone: parsedData.phone,
          address: parsedData.address,
          current_role: selectedJob?.name || "Uncategorized",
          passport_number: parsedData.passport,
          dob: parsedData.dob || null,
          destination_country: parsedData.destination,
          skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
          experience_years: parseInt(parsedData.experienceYears) || 0,
          education: parsedData.education,
          gender: parsedData.gender || null,
          additional_info: {
            notes: parsedData.additionalInfo,
            passport_expiry: parsedData.passportExpiry || null,
            documents_detected: parsedData.documentsFound || []
          },
          status: "Pending",
          assigned_agent_id: selectedAgentId || null,
          assigned_staff_id: selectedStaffId || null
        }]);

      if (error) throw error;
      await logAction("CANDIDATE_UPLOAD", `Uploaded candidate ${parsedData.name}`);
      setStatus("saved");
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      setStatus("error");
    }
  };

  // CHECKUP LOGIC: Determine if critical fields are missing
  const missingFields = [];
  if (status === "success" && parsedData) {
    if (!parsedData.name) missingFields.push("Name");
    if (!parsedData.dob) missingFields.push("Date of Birth");
    if (!parsedData.passport) missingFields.push("Passport Number");
    if (parsedData.experienceYears === "" || parsedData.experienceYears === null) missingFields.push("Experience");
    if (!selectedJobCategory) missingFields.push("Target Job Category");
  }
  const needsCheckup = missingFields.length > 0;

  const calculatedAge = parsedData?.dob ? calculateAge(parsedData.dob) : null;
  const isAgeWarning = calculatedAge !== null && (calculatedAge < 25 || calculatedAge > 44);

  const renderJobCategorySelector = () => (
    <div className="w-full relative select-none" ref={jobDropdownRef}>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        Target Job Category <span className="text-red-500">*</span>
      </label>

      {/* INLINE CREATION MODE (Unchanged & Preserved!) */}
      {isAddingNewJob ? (
        <div className="flex flex-col gap-1 w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-2 w-full">
            <input
              type="text"
              autoFocus
              value={newJobName}
              onChange={e => { setNewJobName(e.target.value); setJobError(""); }}
              className={`flex-1 p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all ${jobError ? 'border-red-500' : 'border-blue-500'}`}
              placeholder="e.g. Forklift Operator"
            />
            <button type="button" onClick={saveNewJobCategory} className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-1 transition-all cursor-pointer">
              <CheckCircle2 className="w-4 h-4" /> Save
            </button>
            <button type="button" onClick={() => { setIsAddingNewJob(false); setJobError(""); }} className="px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center transition-all cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          {jobError && <p className="text-xs text-red-500 font-bold">{jobError}</p>}
        </div>
      ) : (
        /* UPGRADED SEARCHABLE COMBOBOX */
        <div className="relative w-full">
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setIsJobDropdownOpen(!isJobDropdownOpen);
              if (!isJobDropdownOpen) setJobSearchQuery(""); // Clear search when reopening
            }}
            className={`w-full p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all rounded-xl flex items-center justify-between text-left cursor-pointer shadow-2xs
            ${(!selectedJobCategory && status === "success")
                ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700 ring-2 ring-amber-400/50'
                : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800'}`}
          >
            <span className={`truncate pr-2 ${!selectedJobCategory ? 'text-slate-400 dark:text-slate-500' : ''}`}>
              {selectedJobName}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isJobDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu with Search Bar */}
          {isJobDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">

              {/* Search Input */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 relative">
                <Search className="w-4 h-4 absolute left-4 top-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search category name..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevents clicking input from closing menu
                  autoFocus
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Scrollable Category Options */}
              <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 text-xs font-semibold">
                {filteredJobCategories.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 dark:text-slate-500 italic font-medium">
                    No matching category found.
                  </div>
                ) : (
                  filteredJobCategories.map((job) => {
                    const isSelected = String(job.id) === String(selectedJobCategory) || job.id === selectedJobCategory;
                    return (
                      <div
                        key={job.id}
                        onClick={() => {
                          setSelectedJobCategory(job.id);
                          setIsJobDropdownOpen(false);
                        }}
                        className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between truncate ${isSelected
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                          }`}
                      >
                        <span className="truncate pr-2">{job.name}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pinned Action: Add New Category */}
              <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div
                  onClick={() => {
                    setIsAddingNewJob(true);
                    setSelectedJobCategory("");
                    setJobError("");
                    setIsJobDropdownOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Job Category...</span>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto border border-slate-100 dark:border-slate-800 transition-colors duration-200">

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8 w-full max-w-[260px] mx-auto shadow-inner transition-colors duration-200">
        <button onClick={() => setMode("ai")} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${mode === "ai" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
          AI Intake
        </button>
        <button onClick={() => setMode("manual")} className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer ${mode === "manual" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
          Manual Entry
        </button>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Clockwise Candidate Intake
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          {mode === "ai" ? "Upload the bio-data bundle. AI will extract demographics & documents." : "Bypass AI and enter candidate details manually."}
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
              <input type="text" required value={manualData.name} onChange={e => setManualData({ ...manualData, name: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
            </div>
            {renderJobCategorySelector()}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Date of Birth *</label>
              <input type="date" required value={manualData.dob} onChange={e => setManualData({ ...manualData, dob: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Years of Experience *</label>
              <input type="number" required value={manualData.experience} onChange={e => setManualData({ ...manualData, experience: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Passport Number *</label>
              <input type="text" required value={manualData.passport} onChange={e => setManualData({ ...manualData, passport: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase text-slate-900 dark:text-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Target Destination</label>
              <select value={manualData.destination} onChange={e => setManualData({ ...manualData, destination: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all">
                <option value="">Select...</option>
                <option value="Israel">Israel</option>
                <option value="UAE">United Arab Emirates</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Qatar">Qatar</option>
                <option value="Oman">Oman</option>
                <option value="UK">United Kingdom</option>
                <option value="USA">United States</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Additional Skills</label>
              <input type="text" value={manualData.skills} onChange={e => setManualData({ ...manualData, skills: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" placeholder="e.g. TIG Welding, Heavy Equipment" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Additional Notes</label>
              <textarea rows={2} value={manualData.additionalInfo} onChange={e => setManualData({ ...manualData, additionalInfo: e.target.value })} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all" placeholder="Add specific remarks, skills, or observations..." />
            </div>
          </div>
          <button type="submit" className="w-full mt-2 py-3 px-4 bg-slate-900 dark:bg-blue-600 hover:bg-black text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
            <Edit3 className="w-4 h-4" /> Verify & Prepare Data
          </button>
        </form>
      )}

      {/* CONFIRMATION & ASSIGNMENT SECTION */}
      {(status === "success" || status === "saving" || status === "saved") && parsedData && (
        <div className="mt-8 space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {needsCheckup && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-amber-900 dark:text-amber-400">Action Required: Missing Information</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium">
                  The AI could not locate the following fields. Please complete them before saving: <span className="font-bold underline">{missingFields.join(", ")}</span>
                </p>
              </div>
            </div>
          )}

          {calculatedAge !== null && (
            <div className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${isAgeWarning ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300'}`}>
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-sm font-black">Calculated Age: {calculatedAge} Years Old</p>
                {isAgeWarning && <p className="text-xs font-medium">Warning: Candidate is outside the standard 25-44 age bracket.</p>}
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-slate-900 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Data Verification</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={parsedData.name} onChange={e => setParsedData({ ...parsedData, name: e.target.value })} className={`w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white rounded-lg transition-all ${!parsedData.name ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700 ring-2 ring-amber-400/50' : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800'}`} placeholder="Required" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Passport Number <span className="text-red-500">*</span></label>
                <input type="text" value={parsedData.passport} onChange={e => setParsedData({ ...parsedData, passport: e.target.value })} className={`w-full p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white rounded-lg transition-all ${!parsedData.passport ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700 ring-2 ring-amber-400/50' : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800'}`} placeholder="Required" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" value={parsedData.dob} onChange={e => setParsedData({ ...parsedData, dob: e.target.value })} className={`w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white rounded-lg transition-all ${!parsedData.dob ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700 ring-2 ring-amber-400/50' : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800'}`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Years Experience <span className="text-red-500">*</span></label>
                <input type="number" value={parsedData.experienceYears} onChange={e => setParsedData({ ...parsedData, experienceYears: e.target.value })} className={`w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white rounded-lg transition-all ${(parsedData.experienceYears === "" || parsedData.experienceYears === null) ? 'bg-amber-50 border-amber-400 dark:bg-amber-900/20 dark:border-amber-700 ring-2 ring-amber-400/50' : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800'}`} placeholder="Required" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Additional Skills & Certifications</label>
                <input type="text" value={Array.isArray(parsedData.skills) ? parsedData.skills.join(', ') : (parsedData.skills || '')} onChange={e => setParsedData({ ...parsedData, skills: e.target.value.split(',').map((s: string) => s.trim()) })} className="w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white rounded-lg transition-all bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" placeholder="e.g. TIG Welding, NEBOSH Safety, Heavy Machine Operation" />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Additional Notes / AI Summary</label>
              <textarea rows={3} value={parsedData.additionalInfo} onChange={e => setParsedData({ ...parsedData, additionalInfo: e.target.value })} className="w-full p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white rounded-lg transition-all bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800" placeholder="Extracted AI summary or staff notes..." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-end">
              {renderJobCategorySelector()}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                <UserPlus className="w-3 h-3 text-blue-600" /> Source Agent
              </label>
              <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all">
                <option value="">-- Direct / Unassigned --</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                <Shield className="w-3 h-3 text-emerald-600" /> Internal Staff
              </label>
              <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all">
                <option value="">-- Unassigned --</option>
                {staff.map((member) => <option key={member.id} value={member.id}>{member.email}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleSaveToVault}
            disabled={status === "saving" || status === "saved" || needsCheckup}
            className={`w-full py-3 px-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${needsCheckup ? 'bg-amber-500 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {needsCheckup && <><AlertTriangle className="w-4 h-4" /> Complete Missing Fields</>}
            {!needsCheckup && status === "success" && <><Database className="w-4 h-4" /> Confirm & Save to Clockwise DB</>}
            {status === "saving" && <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>}
            {status === "saved" && <><CheckCircle2 className="w-4 h-4" /> Successfully Vaulted!</>}
          </button>
        </div>
      )}
    </div>
  );
}