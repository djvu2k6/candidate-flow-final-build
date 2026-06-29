"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Briefcase, Plus, Loader2, Edit2, Trash2, Check, X, Building2 } from "lucide-react";

export default function JobCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // States for adding a new category
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    // States for editing an existing category
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("job_categories")
            .select("*")
            .order("name", { ascending: true });

        if (data) setCategories(data);
        if (error) console.error("Error fetching categories:", error);
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        // Check for duplicates
        const exists = categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
        if (exists) {
            alert("This category already exists!");
            return;
        }

        const { error } = await supabase
            .from("job_categories")
            .insert([{ name: newCategoryName.trim() }]);

        if (error) {
            alert("Error adding category: " + error.message);
        } else {
            setNewCategoryName("");
            setIsAdding(false);
            fetchCategories();
        }
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editName.trim()) return;

        const { error } = await supabase
            .from("job_categories")
            .update({ name: editName.trim() })
            .eq("id", id);

        if (error) {
            alert("Error updating category: " + error.message);
        } else {
            setEditingId(null);
            fetchCategories();
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the category "${name}"? Candidates with this role will keep it as plain text, but it will be removed from all dropdowns.`)) return;

        const { error } = await supabase
            .from("job_categories")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error deleting category: " + error.message);
        } else {
            fetchCategories();
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
                <p className="text-slate-500 mt-2">Manage the master list of target job roles for your candidates. This list feeds the AI and all dropdowns.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Header / Add Button */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        <h2 className="font-bold text-slate-700 dark:text-slate-200">Active Categories ({categories.length})</h2>
                    </div>

                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-600/20"
                        >
                            <Plus className="w-4 h-4" /> Add Category
                        </button>
                    )}
                </div>

                {/* Add New Category Row */}
                {isAdding && (
                    <div className="p-4 border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            autoFocus
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Senior Electrician"
                            className="flex-1 p-2.5 text-sm bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                        <button onClick={handleAddCategory} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-1 transition-all">
                            <Check className="w-4 h-4" /> Save
                        </button>
                        <button onClick={() => setIsAdding(false)} className="p-2.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Categories List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {categories.length === 0 && !isAdding ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No job categories created yet.</div>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">

                                {editingId === cat.id ? (
                                    // Edit Mode
                                    <div className="flex items-center gap-3 w-full">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 p-2 text-sm bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                        />
                                        <button onClick={() => handleUpdateCategory(cat.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                                            <Check className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    // View Mode
                                    <>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                            <button
                                                onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
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