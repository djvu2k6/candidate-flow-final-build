"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { X, Upload, FileText, Save, Loader2, Trash2, CheckCircle, Calendar, AlertCircle } from "lucide-react";
import { logAction } from "@/lib/audit";

interface CandidateEditorProps {
    candidate: any;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void; // Trigger a refresh in the parent table
}

export default function CandidateEditor({ candidate, isOpen, onClose, onRefresh }: CandidateEditorProps) {
    const [formData, setFormData] = useState({
        name: "",
        skills: "",
        status: "",
        email: "",
        phone: "",
        dob: "",
        passport_number: "",
        passport_expiry: "",
        gender: "",
        notes: "",
    });
    const [documents, setDocuments] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Populate data when panel opens
    useEffect(() => {
        if (candidate && isOpen) {
            setFormData({
                name: candidate.name || "",
                skills: Array.isArray(candidate.skills) ? candidate.skills.join(", ") : (candidate.skills || ""),
                status: candidate.status || "Pending",
                email: candidate.email || "",
                phone: candidate.phone || "",
                dob: candidate.dob || "",
                passport_number: candidate.passport_number || "",
                passport_expiry: candidate.additional_info?.passport_expiry || candidate.passport_expiry || "",
                gender: candidate.gender || "",
                notes: candidate.notes || "",
            });
            fetchDocuments();
        }
    }, [candidate, isOpen]);

    // Fetch documents metadata from Supabase db table
    const fetchDocuments = async () => {
        if (!candidate) return;
        const { data, error } = await supabase
            .from("documents")
            .select("*")
            .eq("candidate_id", candidate.id)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setDocuments(data);
        }
    };

    // Handle standard text updates
    const handleSave = async () => {
        setIsSaving(true);
        // Convert comma string back to array if your DB expects text[]
        const skillsArray = formData.skills.split(",").map(s => s.trim()).filter(s => s);

        const updatedAdditionalInfo = {
            ...(candidate.additional_info || {}),
            passport_expiry: formData.passport_expiry || null
        };

        const { error } = await supabase
            .from("candidates")
            .update({
                name: formData.name,
                skills: skillsArray,
                status: formData.status,
                email: formData.email,
                phone: formData.phone,
                dob: formData.dob || null,
                passport_number: formData.passport_number,
                passport_expiry: formData.passport_expiry || null,
                gender: formData.gender || null,
                notes: formData.notes || null,
                additional_info: updatedAdditionalInfo,
                updated_at: new Date().toISOString()
            })
            .eq("id", candidate.id);

        setIsSaving(false);
        if (!error) {
            await logAction("CANDIDATE_EDIT", `Updated details for candidate ${formData.name} (ID: ${candidate.candidate_id || candidate.id})`);
            onRefresh(); // Refresh table
            onClose();   // Close panel
        } else {
            console.error("Save failed:", error);
        }
    };

    const [uploadDocType, setUploadDocType] = useState("Passport Copy");
    const [uploadDocExpiry, setUploadDocExpiry] = useState("");

    // Handle file uploads directly to Supabase Storage and register in database
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !candidate) return;

        setIsUploading(true);

        // Clean filename to prevent path resolution issues
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const filePath = `candidates/${candidate.id}/${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
            .from("vault")
            .upload(filePath, file);

        if (!uploadError) {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from("vault")
                .getPublicUrl(filePath);

            // Insert metadata record in documents table
            const { error: dbError } = await supabase
                .from("documents")
                .insert([{
                    candidate_id: candidate.id,
                    title: uploadDocType,
                    file_url: publicUrlData.publicUrl,
                    status: "Uploaded",
                    expiry_date: uploadDocExpiry || null
                }]);

            if (!dbError) {
                await logAction(
                    "DOCUMENT_UPLOAD",
                    `Uploaded document '${uploadDocType}' for candidate ${formData.name} (ID: ${candidate.id})`
                );
                // Clear state
                setUploadDocExpiry("");
                fetchDocuments();
            } else {
                console.error("DB Insert failed:", dbError);
            }
        } else {
            console.error("Upload failed:", uploadError);
        }
        setIsUploading(false);
    };

    const deleteDocument = async (docId: string, fileUrl: string, title: string) => {
        // Extract filepath from public URL
        const pathParts = fileUrl.split("/public/vault/");
        const filePath = pathParts[1] ? decodeURIComponent(pathParts[1]) : "";

        if (filePath) {
            await supabase.storage.from("vault").remove([filePath]);
        }

        const { error: dbError } = await supabase
            .from("documents")
            .delete()
            .eq("id", docId);

        if (!dbError) {
            await logAction(
                "DOCUMENT_DELETE",
                `Deleted document '${title}' for candidate ${formData.name} (ID: ${candidate.id})`
            );
            fetchDocuments();
        }
    };

    const handleUpdateDocStatus = async (docId: string, title: string, newStatus: string) => {
        const { error } = await supabase
            .from("documents")
            .update({ status: newStatus })
            .eq("id", docId);

        if (!error) {
            await logAction(
                "DOCUMENT_VERIFY",
                `Updated status of document '${title}' to '${newStatus}' for candidate ${formData.name}`
            );
            fetchDocuments();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Background Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Candidate</h2>
                        <p className="text-xs font-mono text-slate-500 mt-1">{candidate?.candidate_id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Details Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none animate-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none animate-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none animate-all"
                                />
                            </div>
                            
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Passport Number</label>
                                <input
                                    type="text"
                                    value={formData.passport_number}
                                    onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none animate-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Passport Expiry</label>
                                <input
                                    type="date"
                                    value={formData.passport_expiry}
                                    onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none animate-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none"
                                >
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <p className="text-xs text-slate-400 italic">Gender is used for filtering in the candidate roster.</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Skills (Comma separated)</label>
                            <textarea
                                value={formData.skills}
                                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={4}
                                placeholder="English proficiency, personality observations, special notes..."
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/50 outline-none resize-none text-sm"
                            />
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800" />

                     {/* Document Vault Section */}
                     <div className="space-y-4">
                         <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                             <FileText className="w-4 h-4 text-blue-600" /> Document Vault
                         </h3>

                         {/* Document Metadata Inputs before Upload */}
                         <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-inner">
                             <div>
                                 <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1 uppercase tracking-wider">Document Type</label>
                                 <select 
                                     value={uploadDocType} 
                                     onChange={(e) => setUploadDocType(e.target.value)} 
                                     className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                 >
                                     <option value="Passport Copy">Passport Copy</option>
                                     <option value="Medical Certificate">Medical Certificate</option>
                                     <option value="Skill Certs">Skill Certs</option>
                                     <option value="Police Clearance">Police Clearance</option>
                                     <option value="Resume / Bio-Data">Resume / Bio-Data</option>
                                     <option value="Other Document">Other Document</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1 uppercase tracking-wider">Expiry Date (If applicable)</label>
                                 <input 
                                     type="date" 
                                     value={uploadDocExpiry} 
                                     onChange={(e) => setUploadDocExpiry(e.target.value)} 
                                     className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                 />
                             </div>
                         </div>

                         {/* Upload Button */}
                         <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-200 dark:border-slate-750 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                             <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                             {isUploading ? (
                                 <span className="flex items-center gap-2 text-sm font-medium text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span>
                             ) : (
                                 <span className="flex items-center gap-2 text-sm font-medium text-slate-650 dark:text-slate-350 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                     <Upload className="w-4 h-4" /> Upload Selected Doc
                                 </span>
                             )}
                         </label>

                         {/* Document List */}
                         <div className="space-y-3">
                             {documents.length === 0 && !isUploading && (
                                 <p className="text-xs text-center text-slate-500">No documents in vault.</p>
                             )}
                             {documents.map((doc) => (
                                 <div key={doc.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col gap-2 shadow-sm">
                                     <div className="flex items-start justify-between gap-4">
                                         <div>
                                             <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{doc.title}</span>
                                             {doc.expiry_date && (
                                                 <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> Expiry: {new Date(doc.expiry_date).toLocaleDateString()}</p>
                                             )}
                                         </div>
                                         <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded border ${
                                             doc.status === "Verified" ? "bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/30" :
                                             doc.status === "Expired" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 border-rose-100 dark:border-rose-900/30" :
                                             "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-405 border-amber-100 dark:border-amber-900/30"
                                         }`}>
                                             {doc.status || "Uploaded"}
                                         </span>
                                     </div>
                                     <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-2 shrink-0">
                                         <button 
                                             onClick={() => handleUpdateDocStatus(doc.id, doc.title, "Verified")}
                                             disabled={doc.status === "Verified"}
                                             className="px-2 py-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded border border-emerald-100 dark:border-emerald-900/30 disabled:opacity-40"
                                         >
                                             Verify
                                         </button>
                                         <button 
                                             onClick={() => handleUpdateDocStatus(doc.id, doc.title, "Expired")}
                                             disabled={doc.status === "Expired"}
                                             className="px-2 py-1 text-[10px] font-bold text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded border border-rose-100 dark:border-rose-900/30 disabled:opacity-40"
                                         >
                                             Expire
                                         </button>
                                         <button 
                                             onClick={() => deleteDocument(doc.id, doc.file_url, doc.title)} 
                                             className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-transparent hover:border-red-100 transition-colors"
                                             title="Delete Document"
                                         >
                                             <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </>
    );
}