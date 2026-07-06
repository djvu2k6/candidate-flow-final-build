// lib/permissions.ts

export interface UserPermissions {
    can_add_candidates: boolean;
    can_edit_candidates: boolean;
    can_delete_candidates: boolean;
    can_manage_agents: boolean;
    can_export_excel: boolean;
}

// 1. Standard defaults: Reports/Excel is ON (Must-have base right), Delete is OFF
export const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermissions = {
    can_add_candidates: true,
    can_edit_candidates: true,
    can_delete_candidates: false,
    can_manage_agents: false,
    can_export_excel: true,
};

// 2. The Master Check: Evaluates rights cleanly
export function checkPermission(profile: any, permissionKey: keyof UserPermissions): boolean {
    if (!profile) return false;
    if (profile.role === "admin") return true; // Admins get full super-powers automatically
    return !!profile?.permissions?.[permissionKey];
}

// 3. Helper: Check if employee can access Job Categories (Admins OR anyone who can Add Candidates!)
export function canAccessJobCategories(profile: any): boolean {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    return !!profile?.permissions?.can_add_candidates;
}

// 4. Helper: Detect if an employee is in strict Read-Only Mode
export function isReadOnlyUser(profile: any): boolean {
    if (!profile || profile.role === "admin") return false;
    const perms = profile.permissions || {};
    return (
        !perms.can_add_candidates &&
        !perms.can_edit_candidates &&
        !perms.can_delete_candidates &&
        !perms.can_manage_agents &&
        !perms.can_export_excel
    );
}