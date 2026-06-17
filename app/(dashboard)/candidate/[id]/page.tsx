"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, FileText, Calendar, CheckCircle, Clock, Video, UserCheck, Briefcase, MapPin, Award, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { logAction } from "@/lib/audit"; // <-- Phase 7 Integration

export default function CandidateProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [candidate, setCandidate] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // F6: PDF State
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // F4: Interview State
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Assessment");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // F5: Placement State
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState(false);
  const [employerName, setEmployerName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState("24");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCandidateData();
    }
  }, [id]);

  const fetchCandidateData = async () => {
    setLoading(true);
    try {
      const [candRes, docRes, intRes, placeRes] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", id).single(),
        supabase.from("documents").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
        supabase.from("interviews").select("*").eq("candidate_id", id).order("interview_date", { ascending: true }),
        supabase.from("placements").select("*").eq("candidate_id", id).order("created_at", { ascending: false })
      ]);

      if (candRes.data) setCandidate(candRes.data);
      if (docRes.data) setDocuments(docRes.data);
      if (intRes.data) setInterviews(intRes.data);
      if (placeRes.data) setPlacements(placeRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Generate PDF Function
  // Phase 6: Generate PDF Function (Upgraded to html-to-image)
  const handleGeneratePDF = async () => {
    const element = document.getElementById('bio-data-card');
    if (!element) return;
    
    setGeneratingPDF(true);
    try {
      // html-to-image natively understands modern CSS and lab() colors
      const dataUrl = await toPng(element, { 
        cacheBust: true, 
        pixelRatio: 2 // Keeps the PDF crystal clear
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Calculate height dynamically based on the actual DOM element proportions
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`${candidate.name.replace(/\s+/g, '_')}_BioData.pdf`);
      
      // Log the PDF generation download
      await logAction("PDF_DOWNLOAD", `Downloaded Bio-Data for ${candidate.name}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setGeneratingPDF(false);
    }
  };
  // F4: Save Interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    try {
      const { error } = await supabase.from("interviews").insert([
        { candidate_id: id, interview_date: interviewDate, interview_type: interviewType, notes: interviewNotes, status: "Scheduled" }
      ]);
      if (error) throw error;
      
      // F7: Log it!
      await logAction("INTERVIEW_SCHEDULED", `Scheduled ${interviewType} for ${candidate.name}`);

      await fetchCandidateData();
      setIsInterviewModalOpen(false);
      setInterviewDate("");
      setInterviewNotes("");
    } catch (error) {
      console.error(error);
    } finally {
      setScheduling(false);
    }
  };

  // F5: Save Placement
  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacing(true);
    try {
      // 1. Insert into placements table
      const { error: placementError } = await supabase.from("placements").insert([
        {
          candidate_id: id,
          employer_name: employerName,
          job_title: jobTitle,
          destination_country: destCountry,
          start_date: startDate,
          contract_duration_months: parseInt(durationMonths)
        }
      ]);
      if (placementError) throw placementError;

      // 2. Update candidate status to "Placed"
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ status: "Placed" })
        .eq("id", id);
      if (updateError) throw updateError;

      // F7: Log it!
      await logAction("CANDIDATE_PLACED", `Placed ${candidate.name} at ${employerName} as ${jobTitle}`);

      await fetchCandidateData();
      setIsPlacementModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to assign placement.");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest text-sm">Loading Candidate Vault...</div>;
  if (!candidate) return <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center font-bold text-slate-500">Candidate not found.</div>;

  const isPlaced = placements.length > 0;
  const activePlacement = isPlaced ? placements[0] : null;

  return (
    <div className="bg-[#f4f4f5] min-h-screen font-sans pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{candidate.name}</h1>
            <p className="text-sm text-slate-500 font-medium">{candidate.current_role} &bull; {candidate.country}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* F6: PDF Generation Button */}
          <button 
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-900 hover:text-slate-900 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generatingPDF ? "Generating..." : "Download Bio-Data"}
          </button>

          <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold shadow-sm ${candidate.status === 'Placed' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
            {candidate.status}
          </span>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: F1 Bio-Data & F5 Placement Card */}
        {/* WE ADDED id="bio-data-card" HERE FOR THE PDF ENGINE TO CAPTURE */}
        <div className="xl:col-span-1 space-y-8" id="bio-data-card">
          
          {/* F5: PLACEMENT STATUS CARD */}
          <div className={`p-6 rounded-2xl border shadow-sm ${isPlaced ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg flex items-center gap-2 ${isPlaced ? 'text-emerald-900' : 'text-slate-900'}`}>
                <Award className={`w-5 h-5 ${isPlaced ? 'text-emerald-600' : 'text-slate-400'}`} /> 
                Placement Status
              </h3>
              {!isPlaced && (
                <Dialog open={isPlacementModalOpen} onOpenChange={setIsPlacementModalOpen}>
                  <DialogTrigger className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-black transition-colors cursor-pointer" data-html2canvas-ignore>
                    Assign Role
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogTitle className="text-xl font-black text-slate-900 mb-4">Log New Placement</DialogTitle>
                    <form onSubmit={handleSavePlacement} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Employer Name</label>
                        <input type="text" required value={employerName} onChange={(e) => setEmployerName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Job Title</label>
                        <input type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Destination Country</label>
                        <input type="text" required value={destCountry} onChange={(e) => setDestCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Duration (Months)</label>
                          <input type="number" required value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900" />
                        </div>
                      </div>
                      <button type="submit" disabled={placing} className="w-full mt-4 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-slate-400">
                        {placing ? "Logging Placement..." : "Confirm Placement"}
                      </button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {isPlaced ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Employer</p>
                  <p className="font-black text-emerald-950 text-lg">{activePlacement.employer_name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Role & Location</p>
                  <p className="font-medium text-emerald-900 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> {activePlacement.job_title}</p>
                  <p className="font-medium text-emerald-900 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5"/> {activePlacement.destination_country}</p>
                </div>
                <div className="pt-3 border-t border-emerald-200 mt-2">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5">Start Date</p>
                  <p className="font-medium text-emerald-900">{new Date(activePlacement.start_date).toLocaleDateString()} ({activePlacement.contract_duration_months} Months)</p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-sm font-medium text-slate-400">
                Candidate is actively looking for placement.
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-slate-900" /> Profile Overview
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="font-medium text-slate-900">{candidate.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                <p className="font-medium text-slate-900">{candidate.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</p>
                <p className="font-medium text-slate-900">{candidate.experience_years} Years</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: F4 Interviews & F2 Vault */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* F4: Interview Tracker */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Interview Tracker</h3>
              </div>
              
              <Dialog open={isInterviewModalOpen} onOpenChange={setIsInterviewModalOpen}>
                <DialogTrigger className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-black transition-colors cursor-pointer shadow-sm">
                  <Calendar className="w-4 h-4" /> Schedule
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogTitle className="text-xl font-black text-slate-900 mb-4">Schedule Interview</DialogTitle>
                  <form onSubmit={handleScheduleInterview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Date & Time</label>
                      <input type="datetime-local" required value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Interview Type</label>
                      <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all text-sm font-medium">
                        <option>Technical Assessment</option>
                        <option>HR Screening</option>
                        <option>Client Round</option>
                        <option>Visa Prep Mock</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Links</label>
                      <textarea rows={3} value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} placeholder="Add Google Meet link or context..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-900 transition-all text-sm font-medium resize-none" />
                    </div>
                    <button type="submit" disabled={scheduling} className="w-full mt-4 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:bg-slate-400">
                      {scheduling ? "Scheduling..." : "Confirm Schedule"}
                    </button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="p-0">
              {interviews.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium text-sm">No interviews scheduled yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {interviews.map(inv => (
                    <li key={inv.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-full border border-slate-200">
                          <Clock className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{inv.interview_type}</p>
                          <p className="text-sm font-medium text-slate-500 mt-0.5">{new Date(inv.interview_date).toLocaleString()}</p>
                          {inv.notes && <p className="text-xs text-slate-400 mt-1 italic">{inv.notes}</p>}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-slate-900 text-white">
                        {inv.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* F2: Document Vault */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-900" /> Document Vault
            </h3>
            {documents.length === 0 ? (
              <div className="text-center text-slate-400 font-medium text-sm py-4">No documents uploaded.</div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-bold text-slate-700 text-sm">{doc.title}</span>
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">View File</a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}