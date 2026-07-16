"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Briefcase,
    Plus,
    Building2
} from "lucide-react";
import { getCurrentProfile } from "@/app/actions";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import ResumeUploader from "@/components/ResumeUploader";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);

    useEffect(() => {
        const fetchRole = async () => {
            const profile = await getCurrentProfile();
            if (profile) setRole(profile.role);
        };
        fetchRole();
    }, []);

    const isAdmin = role?.toLowerCase() === "admin";

    const allNavItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard, reqAdmin: false },
        { name: "Candidates", href: "/candidate-section", icon: Users, reqAdmin: false },
        { name: "Agents", href: "/agents", icon: Briefcase, reqAdmin: true },
        { name: "Settings", href: "/settings", icon: Settings, reqAdmin: false },
    ];

    const navItems = allNavItems.filter(item => !item.reqAdmin || isAdmin);

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                aria-label="Toggle menu"
            >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out flex flex-col print:hidden
                ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
            `}>
                {/* BRANDING SECTION - NOW WRAPPED IN A LINK TO DASHBOARD */}
                <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="h-[84px] flex items-center px-6 border-b border-slate-100 dark:border-slate-800 shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                    <div className="w-10 h-10 bg-slate-900 dark:bg-blue-600 rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm transition-colors duration-200">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-900 dark:text-white leading-tight">Clockwise</span>
                        <span className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">Consultancy</span>
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">Candidate Flow</span>
                    </div>
                </Link>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200
                                    ${isActive
                                        ? "bg-slate-900 dark:bg-blue-600 text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}
                                `}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-4 mb-4">
                    <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
                        <DialogTrigger className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer">
                            <Plus className="w-4 h-4 shrink-0" />
                            New Candidate
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl bg-transparent border-none shadow-none p-0">
                            <DialogTitle className="sr-only">Upload Resume</DialogTitle>
                            <ResumeUploader />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="px-3 py-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50 flex-1 truncate">
                            Role: <span className={isAdmin ? "text-blue-600 dark:text-blue-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>{role || "..."}</span>
                        </div>
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 cursor-pointer"
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>

            <div
                onClick={() => setIsOpen(false)}
                className={`
                    fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300 ease-in-out
                    ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
                `}
            />
        </>
    );
}