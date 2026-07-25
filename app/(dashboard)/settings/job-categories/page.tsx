"use client";

import React, { useState, useEffect } from "react";
import { getJobCategories, addJobCategory, updateJobCategory, deleteJobCategory, seedJobCategories } from "@/app/actions";
import { Briefcase, Plus, Loader2, Edit2, Trash2, Check, X, Building2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export default function JobCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // States for adding a new category
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    // States for editing an existing category
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    // States for seeding default categories
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState<{ created: number; skipped: number } | null>(null);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const data = await getJobCategories();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        const exists = categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
        if (exists) {
            alert("This category already exists!");
            return;
        }

        try {
            await addJobCategory(newCategoryName.trim());
            setNewCategoryName("");
            setIsAdding(false);
            fetchCategories();
        } catch (error: any) {
            alert("Error adding category: " + error.message);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await updateJobCategory(id, editName.trim());
            setEditingId(null);
            fetchCategories();
        } catch (error: any) {
            alert("Error updating category: " + error.message);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? Candidates with this role will keep it as plain text, but it will be removed from all dropdowns.`)) return;
        try {
            await deleteJobCategory(id);
            fetchCategories();
        } catch (error: any) {
            alert("Error deleting category: " + error.message);
        }
    };

    const handleSeedDefaults = async () => {
        if (!confirm("This will add all standard immigration & overseas recruitment job categories that are missing from your list. Existing categories will NOT be duplicated. Proceed?")) return;
        setIsSeeding(true);
        setSeedResult(null);
        try {
            const results = await seedJobCategories();
            const created = results.filter((r: any) => r.status === "created").length;
            const skipped = results.filter((r: any) => r.status === "already_exists").length;
            setSeedResult({ created, skipped });
            fetchCategories();
        } catch (error: any) {
            alert("Error seeding categories: " + error.message);
        } finally {
            setIsSeeding(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    Job Categories
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Manage the master list of target job roles. This list feeds the AI parser and all dropdowns across the system.
                </p>
            </div>

            {/* Seed Result Banner */}
            {seedResult && (
                <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${seedResult.created > 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"}`}>
                    {seedResult.created > 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {seedResult.created > 0
                                ? `${seedResult.created} default categories added successfully!`
                                : "All default categories already exist in your list."}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {seedResult.created} added · {seedResult.skipped} already existed (skipped)
                        </p>
                    </div>
                    <button onClick={() => setSeedResult(null)} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Header / Action Buttons */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Active Categories ({categories.length})</h2>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Seed Default Categories Button */}
                        <button
                            onClick={handleSeedDefaults}
                            disabled={isSeeding}
                            title="Bulk-add all standard immigration & overseas recruitment job roles"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-sm font-bold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
                        >
                            {isSeeding ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Seed Default Categories</>
                            )}
                        </button>

                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" /> Add Category
                            </button>
                        )}
                    </div>
                </div>

                {/* Add New Category Row */}
                {isAdding && (
                    <div className="p-4 border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            autoFocus
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                            placeholder="e.g. Senior Electrician"
                            className="flex-1 p-2.5 text-sm bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                        <button onClick={handleAddCategory} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-1 transition-all cursor-pointer">
                            <Check className="w-4 h-4" /> Save
                        </button>
                        <button onClick={() => setIsAdding(false)} className="p-2.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Categories List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {categories.length === 0 && !isAdding ? (
                        <div className="p-12 text-center">
                            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold">No job categories yet.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5">
                                Click <span className="font-bold text-indigo-600 dark:text-indigo-400">"Seed Default Categories"</span> above to instantly add all standard immigration job roles.
                            </p>
                        </div>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                {editingId === cat.id ? (
                                    <div className="flex items-center gap-3 w-full">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleUpdateCategory(cat.id)}
                                            className="flex-1 p-2 text-sm bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                        />
                                        <button onClick={() => handleUpdateCategory(cat.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors cursor-pointer">
                                            <Check className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                            <button
                                                onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}