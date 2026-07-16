"use client";

import { bulkImportCandidates } from "@/app/actions";
import { useState } from "react";
import Papa from "papaparse";
import { UploadCloud, FileText, CheckCircle, AlertCircle, SkipForward } from "lucide-react";
import Link from "next/link";

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; message: string }>({ type: "", message: "" });
  const [importSummary, setImportSummary] = useState<{ inserted: number; skipped: number; skippedNames: string[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus({ type: "", message: "" });
      setImportSummary(null);
    }
  };

  const processImport = async () => {
    if (!file) return;
    setLoading(true);
    setImportSummary(null);
    setStatus({ type: "", message: "Parsing CSV..." });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          setStatus({ type: "", message: `Found ${rows.length} rows. Processing...` });

          const importSummary = await bulkImportCandidates(rows);

          setImportSummary(importSummary);
          setStatus({
            type: 'success',
            message: `Import complete — ${importSummary.inserted} added, ${importSummary.skipped} skipped.`,
          });
          setFile(null);
        } catch (error: any) {
          setStatus({ type: "error", message: `Upload failed: ${error.message}` });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setStatus({ type: "error", message: `File parsing error: ${error.message}` });
        setLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Bulk Importer</h1>
            <p className="text-slate-500 mt-1">Upload legacy candidates via CSV</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="w-16 h-16 text-blue-600 mb-4" />
              <span className="text-lg font-bold text-slate-700">Click to upload your CSV file</span>
              <span className="text-sm text-slate-500 mt-2">
                Expected headers: Full Name, Passport Number, Gender, Nationality, Job Title, Skills, Preferred Country, Phone, Marital Status
              </span>
            </label>
          </div>

          {file && (
            <div className="mt-6 flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <span className="font-semibold text-slate-800">{file.name}</span>
              </div>
              <button
                onClick={processImport}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Processing..." : "Import Data"}
              </button>
            </div>
          )}

          {/* Loading progress indicator */}
          {loading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-blue-700">{status.message}</span>
              </div>
            </div>
          )}

          {/* Status message */}
          {!loading && status.message && (
            <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
              {status.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
              {status.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="font-bold">{status.message}</span>
            </div>
          )}

          {/* Skipped candidates detail */}
          {importSummary && importSummary.skipped > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-bold text-amber-700">
                  {importSummary.skipped} candidate{importSummary.skipped > 1 ? 's' : ''} skipped — passport number already exists in vault:
                </span>
              </div>
              <ul className="text-xs text-amber-700 space-y-1 ml-6 list-disc">
                {importSummary.skippedNames.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}