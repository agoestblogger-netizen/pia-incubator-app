"use client";

import { useState } from "react";
import {
  toggleRolePermissionAction,
  assignUserRoleTimAction,
  removeUserRoleTimAction,
  createCustomRoleAction,
  deleteCustomRoleAction,
} from "@/app/actions/admin-roles";
import {
  toggleSprintCapacityRoleAction,
  type SprintRoleConfigItem,
} from "@/app/actions/sprint-role-config";
import {
  togglePhaseGateBypassRoleAction,
  type PhaseGateBypassRoleItem,
} from "@/app/actions/phase-gate-bypass";
import {
  createUserAction,
  updateUserNameAction,
  resetUserPasswordAction,
  deleteUserSmartAction,
  toggleUserStatusAction,
  checkUserReferencesAction,
} from "@/app/actions/user";
import { toast } from "@/components/ui/ToastProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Check,
  X,
  Shield,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  UserPlus,
  Search,
  KeyRound,
  Mail,
  Building2,
  ShieldAlert,
  Loader2,
  Power,
  Layers,
  Edit,
  AlertTriangle,
  Lock,
  PlusCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import {
  PEGADAIAN_HEADER_GRADIENT_STYLE,
  getRoleBadgeToken,
} from "@/lib/theme/tokens";

export function RolesClient({ initialData }: { initialData: any }) {
  const canManageUsers = initialData?.canManageUsers ?? true;
  const canCreateUser = initialData?.canCreateUser ?? true;
  const canEditName = initialData?.canEditName ?? true;
  const isPerTimScope = Boolean(initialData?.isPerTimScope);
  const callerTimIds: string[] = initialData?.callerTimIds || [];

  const [activeTab, setActiveTab] = useState<"matrix" | "users" | "sprint-capacity" | "phase-gate-bypass">(
    canManageUsers ? "matrix" : "users"
  );

  // State for Phase Gate Bypass Role Config
  const [phaseGateBypassConfigs, setPhaseGateBypassConfigs] = useState<PhaseGateBypassRoleItem[]>(
    initialData.phaseGateBypassConfigs || []
  );
  const [togglingBypassRoleCode, setTogglingBypassRoleCode] = useState<string | null>(null);

  const handleTogglePhaseGateBypass = async (roleCode: string, currentBypass: boolean) => {
    setTogglingBypassRoleCode(roleCode);
    const newBypass = !currentBypass;
    // Optimistic update
    setPhaseGateBypassConfigs((prev) =>
      prev.map((r) => (r.roleCode === roleCode ? { ...r, isBypass: newBypass } : r))
    );

    const res = await togglePhaseGateBypassRoleAction(roleCode, newBypass);
    if (res.success) {
      toast.success(
        `Role ${roleCode} ${newBypass ? "sekarang diizinkan bypass" : "dikunci (harus Lanjut)"} gerbang Market Validation.`
      );
    } else {
      // Rollback
      setPhaseGateBypassConfigs((prev) =>
        prev.map((r) => (r.roleCode === roleCode ? { ...r, isBypass: currentBypass } : r))
      );
      toast.error(res.error || "Gagal mengubah konfigurasi bypass role.");
    }
    setTogglingBypassRoleCode(null);
  };

  // State for Sprint Capacity Role Config (Paket 24b)
  const [sprintRoleConfigs, setSprintRoleConfigs] = useState<SprintRoleConfigItem[]>(
    initialData.sprintRoleConfigs || []
  );
  const [togglingSprintRoleCode, setTogglingSprintRoleCode] = useState<string | null>(null);

  const handleToggleSprintRole = async (roleCode: string, currentIncluded: boolean) => {
    setTogglingSprintRoleCode(roleCode);
    const newIncluded = !currentIncluded;
    // Optimistic update
    setSprintRoleConfigs((prev) =>
      prev.map((r) => (r.roleCode === roleCode ? { ...r, isIncluded: newIncluded } : r))
    );

    const res = await toggleSprintCapacityRoleAction(roleCode, newIncluded);
    if (res.success) {
      toast.success(
        `Role ${roleCode} ${newIncluded ? "sekarang dihitung" : "tidak dihitung"} di Kapasitas Sprint Planning.`
      );
    } else {
      // Rollback
      setSprintRoleConfigs((prev) =>
        prev.map((r) => (r.roleCode === roleCode ? { ...r, isIncluded: currentIncluded } : r))
      );
      toast.error(res.error || "Gagal mengubah konfigurasi role.");
    }
    setTogglingSprintRoleCode(null);
  };

  // State for RBAC Matrix
  const [rolesList, setRolesList] = useState<any[]>(initialData.roles || []);
  const [rolePermissions, setRolePermissions] = useState<any[]>(initialData.rolePermissions || []);
  const [userRoles, setUserRoles] = useState<any[]>(initialData.userRoles || []);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedTimId, setSelectedTimId] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // State for Custom Role Creation
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleScope, setNewRoleScope] = useState<"per_tim" | "global">("per_tim");
  const [newRoleDeskripsi, setNewRoleDeskripsi] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // State for User Management
  const [usersList, setUsersList] = useState<any[]>(initialData.users || []);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // Create User State
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("gadai123");
  const [newConfirmPassword, setNewConfirmPassword] = useState("gadai123");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showNewUserConfirmPassword, setShowNewUserConfirmPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editNama, setEditNama] = useState("");
  const [savingEditName, setSavingEditName] = useState(false);
  const [editNameMsg, setEditNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reset Password State in Edit Modal
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetConfirmPasswordVal, setResetConfirmPasswordVal] = useState("");
  const [showResetPasswordVal, setShowResetPasswordVal] = useState(false);
  const [showResetConfirmPasswordVal, setShowResetConfirmPasswordVal] = useState(false);
  const [savingResetPassword, setSavingResetPassword] = useState(false);
  const [resetPasswordMsg, setResetPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [userRefInfo, setUserRefInfo] = useState<any | null>(null);
  const [checkingRefs, setCheckingRefs] = useState(false);

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const permissions = initialData.permissions || [];
  const teams = initialData.teams || [];

  // Group permissions by modul
  const groupedPermissions = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.modul]) acc[p.modul] = [];
    acc[p.modul].push(p);
    return acc;
  }, {});

  const isAllowed = (roleId: string, permissionId: string) => {
    const rp = rolePermissions.find(
      (item) => item.roleId === roleId && item.permissionId === permissionId
    );
    return rp ? rp.diizinkan : false;
  };

  const handleToggle = async (roleId: string, permissionId: string, roleCode: string) => {
    if (roleCode === "admin_ic") return; // Admin IC cannot be toggled

    const currentAllowed = isAllowed(roleId, permissionId);
    const nextAllowed = !currentAllowed;

    // Optimistic UI update
    setRolePermissions((prev) => {
      const existing = prev.find(
        (rp) => rp.roleId === roleId && rp.permissionId === permissionId
      );
      if (existing) {
        return prev.map((rp) =>
          rp.roleId === roleId && rp.permissionId === permissionId
            ? { ...rp, diizinkan: nextAllowed }
            : rp
        );
      } else {
        return [...prev, { roleId, permissionId, diizinkan: nextAllowed }];
      }
    });

    const res = await toggleRolePermissionAction(roleId, permissionId, nextAllowed);
    if (!res.success) {
      // Rollback on failure
      setRolePermissions((prev) =>
        prev.map((rp) =>
          rp.roleId === roleId && rp.permissionId === permissionId
            ? { ...rp, diizinkan: currentAllowed }
            : rp
        )
      );
      toast.error(res.error || "Gagal mengubah hak akses.", "Gagal Ubah Izin");
    } else {
      toast.success("Hak akses role berhasil diperbarui.", "Izin Diperbarui", 2000);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Harap pilih pengguna dan role terlebih dahulu.", "Validasi Diperlukan");
      return;
    }

    setSavingAssign(true);
    setMsg(null);

    const res = await assignUserRoleTimAction({
      userId: selectedUserId,
      roleId: selectedRoleId,
      timInovatorId: selectedTimId || null,
    });

    if (res.success && res.data) {
      const targetUser = usersList.find((u: any) => u.id === selectedUserId);
      const targetRole = rolesList.find((r: any) => r.id === selectedRoleId);

      setUserRoles((prev) => [
        {
          id: res.data.id,
          userId: selectedUserId,
          roleId: selectedRoleId,
          timInovatorId: selectedTimId || null,
          roleName: targetRole?.namaRole,
          roleCode: targetRole?.kodeRole,
          userName: targetUser?.nama,
          userEmail: targetUser?.email,
        },
        ...prev,
      ]);

      toast.success("Role pengguna berhasil ditetapkan!", "Penugasan Role");
      setMsg({ type: "success", text: "Role pengguna berhasil ditetapkan!" });
      setIsAssignOpen(false);
      setSelectedUserId("");
      setSelectedRoleId("");
      setSelectedTimId("");
    } else {
      const errMsg = res.error || "Gagal menetapkan role.";
      toast.error(errMsg, "Gagal Penugasan");
    }

    setSavingAssign(false);
  };

  const handleRemoveRole = async (id: string) => {
    if (!confirm("Hapus penugasan role ini?")) return;
    const res = await removeUserRoleTimAction(id);
    if (res.success) {
      setUserRoles(userRoles.filter((ur) => ur.id !== id));
      toast.success("Penugasan role berhasil dihapus.", "Role Dihapus");
      setMsg({ type: "success", text: "Penugasan role berhasil dihapus!" });
    } else {
      const errMsg = res.error || "Gagal menghapus penugasan role.";
      toast.error(errMsg, "Gagal Hapus Role");
    }
  };

  // Custom Role Handlers
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRoleError(null);

    const trimmedName = newRoleName.trim();
    if (!trimmedName) {
      setCreateRoleError("Nama role wajib diisi.");
      return;
    }

    setCreatingRole(true);
    const res = await createCustomRoleAction({
      namaRole: trimmedName,
      scope: newRoleScope,
      deskripsi: newRoleDeskripsi.trim() || undefined,
    });

    if (res.success && res.role) {
      setRolesList((prev) => [...prev, res.role]);
      toast.success(`Role kustom "${res.role.namaRole}" berhasil dibuat!`, "Role Baru");
      setMsg({ type: "success", text: `Role kustom "${res.role.namaRole}" berhasil dibuat dengan seluruh izin awal Tanpa Akses.` });
      setIsCreateRoleOpen(false);
      setNewRoleName("");
      setNewRoleScope("per_tim");
      setNewRoleDeskripsi("");
    } else {
      const errMsg = res.error || "Gagal membuat role kustom.";
      toast.error(errMsg, "Gagal Membuat Role");
      setCreateRoleError(errMsg);
    }
    setCreatingRole(false);
  };

  const handleDeleteCustomRole = async (role: any) => {
    if (!confirm(`Hapus role kustom "${role.namaRole}" secara permanen?`)) return;

    setDeletingRoleId(role.id);
    const res = await deleteCustomRoleAction(role.id);

    if (res.success) {
      setRolesList((prev) => prev.filter((r) => r.id !== role.id));
      setUserRoles((prev) => prev.filter((ur) => ur.roleId !== role.id));
      toast.success(res.message || `Role "${role.namaRole}" berhasil dihapus.`, "Role Dihapus");
      setMsg({ type: "success", text: res.message || `Role "${role.namaRole}" berhasil dihapus.` });
    } else {
      const errMsg = res.error || "Gagal menghapus role.";
      toast.error(errMsg, "Gagal Menghapus Role");
    }
    setDeletingRoleId(null);
  };

  // User Management Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);

    if (!newNama.trim()) {
      setCreateUserError("Nama lengkap wajib diisi.");
      return;
    }
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setCreateUserError("Email tidak valid.");
      return;
    }
    if (newPassword.length < 6) {
      setCreateUserError("Password minimal 6 karakter.");
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setCreateUserError("Konfirmasi password tidak cocok.");
      return;
    }

    setCreatingUser(true);
    const res = await createUserAction({
      nama: newNama,
      email: newEmail,
      password: newPassword,
      timId: isPerTimScope && callerTimIds.length > 0 ? callerTimIds[0] : undefined,
    });

    if (res.success && res.user) {
      setUsersList((prev) => [res.user, ...prev]);
      toast.success(`Pengguna ${res.user.nama} berhasil dibuat!`, "User Ditambahkan");
      setMsg({ type: "success", text: `User ${res.user.nama} berhasil dibuat!` });
      setIsCreateUserOpen(false);
      setNewNama("");
      setNewEmail("");
      setNewPassword("gadai123");
      setNewConfirmPassword("gadai123");
    } else {
      const errMsg = res.error || "Gagal membuat user.";
      toast.error(errMsg, "Gagal Membuat User");
      setCreateUserError(errMsg);
    }
    setCreatingUser(false);
  };

  // Edit User Handlers
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditNama(user.nama || "");
    setEditNameMsg(null);
    setResetPasswordVal("");
    setResetConfirmPasswordVal("");
    setResetPasswordMsg(null);
  };

  const handleSaveEditName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEditName(true);
    setEditNameMsg(null);

    const res = await updateUserNameAction(editingUser.id, editNama);
    if (res.success && res.user) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, nama: res.user.nama } : u))
      );
      setEditingUser((prev: any) => ({ ...prev, nama: res.user.nama }));
      toast.success("Nama pengguna berhasil diperbarui!", "Pembaruan Berhasil");
      setEditNameMsg({ type: "success", text: "Nama pengguna berhasil diperbarui!" });
    } else {
      const errMsg = res.error || "Gagal memperbarui nama.";
      toast.error(errMsg, "Gagal Update Nama");
      setEditNameMsg({ type: "error", text: errMsg });
    }
    setSavingEditName(false);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setResetPasswordMsg(null);

    if (resetPasswordVal.length < 6) {
      const errMsg = "Password baru minimal 6 karakter.";
      toast.error(errMsg, "Validasi Password");
      setResetPasswordMsg({ type: "error", text: errMsg });
      return;
    }
    if (resetPasswordVal !== resetConfirmPasswordVal) {
      const errMsg = "Konfirmasi password tidak cocok.";
      toast.error(errMsg, "Validasi Password");
      setResetPasswordMsg({ type: "error", text: errMsg });
      return;
    }

    setSavingResetPassword(true);
    const res = await resetUserPasswordAction(editingUser.id, resetPasswordVal);
    if (res.success) {
      toast.success("Kata sandi berhasil di-reset!", "Reset Password");
      setResetPasswordMsg({ type: "success", text: "Password berhasil di-reset!" });
      setResetPasswordVal("");
      setResetConfirmPasswordVal("");
    } else {
      const errMsg = res.error || "Gagal me-reset password.";
      toast.error(errMsg, "Gagal Reset Password");
      setResetPasswordMsg({ type: "error", text: errMsg });
    }
    setSavingResetPassword(false);
  };

  // Delete User Smart Action
  const handleOpenDelete = async (user: any) => {
    setDeletingUser(user);
    setUserRefInfo(null);
    setCheckingRefs(true);
    const refRes = await checkUserReferencesAction(user.id);
    if (refRes.success) {
      setUserRefInfo(refRes);
    }
    setCheckingRefs(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setDeletingLoading(true);

    const res = await deleteUserSmartAction(deletingUser.id);
    if (res.success) {
      if (res.mode === "hard_deleted") {
        setUsersList((prev) => prev.filter((u) => u.id !== deletingUser.id));
        toast.success(res.message || "User berhasil dihapus permanen.", "Hapus User");
        setMsg({ type: "success", text: res.message || "User berhasil dihapus permanen." });
      } else {
        setUsersList((prev) =>
          prev.map((u) => (u.id === deletingUser.id ? { ...u, statusAktif: false } : u))
        );
        toast.info(res.message || "User berhasil dinonaktifkan.", "Non-Aktifkan User");
        setMsg({ type: "info", text: res.message || "User berhasil dinonaktifkan." });
      }
      setDeletingUser(null);
    } else {
      const errMsg = res.error || "Gagal memproses penghapusan user.";
      toast.error(errMsg, "Gagal Hapus User");
    }
    setDeletingLoading(false);
  };

  const handleToggleUserStatus = async (user: any) => {
    const nextStatus = !user.statusAktif;
    setTogglingUserId(user.id);
    const res = await toggleUserStatusAction(user.id, nextStatus);
    if (res.success) {
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, statusAktif: nextStatus } : u))
      );
      toast.success(`Status user ${user.nama} berhasil diubah menjadi ${nextStatus ? "Aktif" : "Non-Aktif"}.`, "Status Diperbarui");
      setMsg({
        type: "success",
        text: `Status user ${user.nama} berhasil diubah menjadi ${nextStatus ? "Aktif" : "Non-Aktif"}.`,
      });
    } else {
      const errMsg = res.error || "Gagal mengubah status user.";
      toast.error(errMsg, "Gagal Ubah Status");
    }
    setTogglingUserId(null);
  };

  // Filter users by search
  const filteredUsers = usersList.filter(
    (u) =>
      u.nama?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner Gradient Pegadaian */}
      <div
        style={PEGADAIAN_HEADER_GRADIENT_STYLE}
        className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-white/10"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-semibold text-white backdrop-blur-md mb-3 border border-white/15">
            <ShieldCheck className="h-3.5 w-3.5 text-[#E6CA65]" />
            Manajemen Pengguna & Hak Akses RBAC
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight drop-shadow-xs">
            User & Role Management
          </h1>
          <p className="text-sm text-green-100/90 mt-2 leading-relaxed font-normal">
            Kelola pengguna portal inovasi, matriks perizinan 9 peran RBAC, pembuatan custom role, dan penugasan peran tim.
          </p>
        </div>
      </div>

      {/* Feedback Alert */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            msg.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : msg.type === "info"
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex border-b border-gray-200 gap-8">
        {canManageUsers && (
          <button
            onClick={() => setActiveTab("matrix")}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "matrix"
                ? "border-[#0F5132] text-[#0F5132]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Matriks Hak Akses Role ({rolesList.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "border-[#0F5132] text-[#0F5132]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Kelola User ({usersList.length})</span>
        </button>

        {canManageUsers && (
          <button
            onClick={() => setActiveTab("sprint-capacity")}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "sprint-capacity"
                ? "border-[#0F5132] text-[#0F5132]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Kapasitas Sprint ({sprintRoleConfigs.filter((r) => r.isIncluded).length} Aktif)</span>
          </button>
        )}

        {canManageUsers && (
          <button
            onClick={() => setActiveTab("phase-gate-bypass")}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "phase-gate-bypass"
                ? "border-[#0F5132] text-[#0F5132]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Gerbang Fase CV→MV ({phaseGateBypassConfigs.filter((r) => r.isBypass).length} Bypass Aktif)</span>
          </button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MATRIKS HAK AKSES ROLE */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {canManageUsers && activeTab === "matrix" && (
        <div className="space-y-8">
          {/* Bagian 1: Matriks Permission */}
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  Matriks Hak Akses (Matrix Permissions)
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  Klik ikon untuk mengaktifkan atau menonaktifkan izin per modul. Admin Innovation Center selalu memiliki izin penuh.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setCreateRoleError(null);
                  setIsCreateRoleOpen(true);
                }}
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs shrink-0"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                + Buat Role Baru
              </Button>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold">
                    <th className="p-3.5 border-r border-gray-200 w-80">Modul & Hak Akses</th>
                    {rolesList.map((r: any) => {
                      const isCustom = !r.isDefault;
                      return (
                        <th
                          key={r.id}
                          className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                            r.kodeRole === "admin_ic"
                              ? "bg-amber-50/70 text-amber-900"
                              : r.kodeRole === "divisi_ic"
                              ? "bg-emerald-50/70 text-emerald-950"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold">{r.namaRole}</span>
                            {isCustom && (
                              <button
                                type="button"
                                disabled={deletingRoleId === r.id}
                                onClick={() => handleDeleteCustomRole(r)}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50"
                                title={`Hapus role kustom "${r.namaRole}"`}
                              >
                                {deletingRoleId === r.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono font-normal block mt-0.5">
                            {r.scope} {isCustom ? "(Custom)" : ""}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(groupedPermissions).map(([modul, perms]: [string, any]) => (
                    <tr key={modul} className="group">
                      <td colSpan={rolesList.length + 1} className="p-0">
                        <div className="bg-gray-100/70 font-bold text-gray-800 px-3.5 py-1.5 uppercase text-[10px] tracking-wider">
                          Modul: {modul.replace("_", " ")}
                        </div>
                        <table className="w-full border-collapse">
                          <tbody>
                            {perms.map((p: any) => (
                              <tr
                                key={p.id}
                                className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                              >
                                <td className="p-3 border-r border-gray-200 w-80">
                                  <div className="font-semibold text-gray-900 font-mono text-[11px]">
                                    {p.kodePermission}
                                  </div>
                                  <div className="text-gray-500 text-[11px]">{p.deskripsi}</div>
                                </td>
                                {rolesList.map((r: any) => {
                                  const allowed = isAllowed(r.id, p.id);
                                  const isAdmin = r.kodeRole === "admin_ic";

                                  return (
                                    <td
                                      key={r.id}
                                      className={`p-2 text-center border-r border-gray-100 last:border-r-0 ${
                                        isAdmin ? "bg-amber-50/30" : ""
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        disabled={isAdmin}
                                        onClick={() => handleToggle(r.id, p.id, r.kodeRole)}
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                                          allowed
                                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                                            : "bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-500"
                                        } ${isAdmin ? "cursor-default opacity-80" : "cursor-pointer"}`}
                                        title={
                                          isAdmin
                                            ? "Izin Admin IC terkunci aktif"
                                            : `Ubah izin ${p.kodePermission} untuk ${r.namaRole}`
                                        }
                                      >
                                        {allowed ? (
                                          <Check className="h-4 w-4 stroke-[3]" />
                                        ) : (
                                          <X className="h-4 w-4 stroke-[2]" />
                                        )}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Bagian 2: Penugasan Role Global/Tim */}
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  Daftar Penugasan Role Akun Pengguna
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Riwayat role yang terhubung ke masing-masing pengguna di seluruh tim inovator
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAssignOpen(true)}
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Tetapkan Role Baru
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold">
                    <th className="p-3">Nama Pengguna</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role Diberikan</th>
                    <th className="p-3">Scope / Tim Inovator</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userRoles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400">
                        Belum ada penugasan role terdaftar.
                      </td>
                    </tr>
                  ) : (
                    userRoles.map((ur: any) => (
                      <tr key={ur.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 font-semibold text-gray-900">{ur.userName}</td>
                        <td className="p-3 text-gray-500 font-mono">{ur.userEmail}</td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={
                              ur.roleCode === "admin_ic"
                                ? "bg-amber-100 text-amber-900 border-amber-200"
                                : ur.roleCode === "divisi_ic"
                                ? "bg-emerald-100 text-emerald-950 border-emerald-200"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {ur.roleName}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {ur.timInovatorId ? (
                            <span className="text-[#0F5132] font-semibold">
                              Tim: {teams.find((t: any) => t.id === ur.timInovatorId)?.nama || ur.timInovatorId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded text-[10px] border border-purple-200">
                              Global (Seluruh Tim)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(ur.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            title="Hapus penugasan role"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: KELOLA USER (USER MANAGEMENT) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {isPerTimScope && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center gap-3 shadow-xs">
              <Users className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Mode Akses Per-Tim Aktif</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Hak akses Anda dibatasi dalam konteks tim Anda. Anda hanya dapat melihat dan mengelola pengguna yang terdaftar di tim Anda.
                </p>
              </div>
            </div>
          )}

          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#0F5132]" />
                    Daftar Pengguna Aplikasi
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-1">
                    Kelola akun login inovator, coach, promotor, sponsor, dan admin.
                  </CardDescription>
                </div>

                {canCreateUser && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateUserError(null);
                      setIsCreateUserOpen(true);
                    }}
                    className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    + Tambah User Baru
                  </Button>
                )}
              </div>

              {/* Search Bar */}
              <div className="pt-3">
                <div className="relative max-w-sm">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Cari nama atau email pengguna..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="pl-9 h-9 text-xs border-gray-200 bg-white"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-700 font-bold">
                    <th className="p-3.5">Nama Pengguna</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Role Terhubung</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 text-xs">
                        {searchUserQuery
                          ? "Tidak ada user yang cocok dengan kata kunci pencarian."
                          : "Belum ada user terdaftar."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => {
                      const userAssignedRoles = userRoles.filter((ur: any) => ur.userId === u.id);

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="p-3.5 font-semibold text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-[#0F5132]/10 text-[#0F5132] flex items-center justify-center font-bold text-xs shrink-0">
                                {u.nama ? u.nama.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">{u.nama}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{u.id.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-600 font-mono">{u.email}</td>
                          <td className="p-3.5">
                            {u.statusAktif ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                                Non-Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {userAssignedRoles.length === 0 ? (
                              <span className="text-gray-400 italic text-[11px]">Belum ada role</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {userAssignedRoles.map((ur: any, idx: number) => {
                                  const roleToken = getRoleBadgeToken(ur.roleCode);
                                  return (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center text-[10px] py-0.5 px-2 rounded-full font-bold border ${roleToken.bg} ${roleToken.text} ${roleToken.border}`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full ${roleToken.dot} mr-1`} />
                                      {ur.roleName}
                                      {ur.timInovatorId && (
                                        <span className="text-[9px] opacity-75 ml-1 font-semibold">
                                          (Tim)
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button */}
                              {canEditName && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(u)}
                                  className="h-8 px-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg gap-1"
                                  title={canManageUsers ? "Edit nama & reset password" : "Edit nama pengguna"}
                                >
                                  <Edit className="h-3.5 w-3.5 text-blue-600" />
                                  <span>Edit</span>
                                </Button>
                              )}

                              {/* Toggle Status Button */}
                              {canManageUsers && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={togglingUserId === u.id}
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`h-8 px-2 text-xs font-semibold rounded-lg gap-1 ${
                                    u.statusAktif
                                      ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      : "text-green-600 hover:text-green-700 hover:bg-green-50"
                                  }`}
                                  title={u.statusAktif ? "Nonaktifkan akun" : "Aktifkan akun"}
                                >
                                  <Power className="h-3.5 w-3.5" />
                                  <span>{u.statusAktif ? "Nonaktifkan" : "Aktifkan"}</span>
                                </Button>
                              )}

                              {/* Delete Button */}
                              {canManageUsers && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDelete(u)}
                                  className="h-8 px-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg gap-1"
                                  title="Hapus pengguna"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Hapus</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: PENGATURAN ROLE KAPASITAS SPRINT PLANNING (PAKET 24B) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {canManageUsers && activeTab === "sprint-capacity" && (
        <div className="space-y-6">
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/40 border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-[#0F5132] border border-emerald-200">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold text-gray-900">
                    Pengaturan Role untuk Kapasitas Sprint Planning
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 mt-1">
                    Konfigurasi global sistem untuk menentukan role mana saja yang diikutsertakan dalam penghitungan kapasitas kerja dan alokasi subtask di panel Sprint Planning tim inovator.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Nama Role &amp; Kode</th>
                      <th className="py-3.5 px-4">Deskripsi / Peruntukan</th>
                      <th className="py-3.5 px-4 text-center">Status di Sprint Planning</th>
                      <th className="py-3.5 px-4 text-center">Aksi Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sprintRoleConfigs.map((roleCfg, idx) => {
                      const isToggling = togglingSprintRoleCode === roleCfg.roleCode;
                      return (
                        <tr key={roleCfg.roleCode} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 text-center font-medium text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 text-xs">
                              {roleCfg.roleName}
                            </div>
                            <code className="text-[10px] text-gray-400 font-mono">
                              {roleCfg.roleCode}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {roleCfg.roleCode === "co_creator" && "Anggota tim inti pelaksana teknis inovasi (Co-creator). Default: ON."}
                            {roleCfg.roleCode === "coach" && "Pembimbing metodologi & coaching tim inovasi. Default: ON."}
                            {roleCfg.roleCode === "inisiator" && "Pengusul ide proyek inovasi awal."}
                            {roleCfg.roleCode === "project_owner" && "Penanggung jawab strategis proyek dari unit bisnis."}
                            {roleCfg.roleCode === "sponsor" && "Pimpinan unit/Divisi sponsor proyek inovasi."}
                            {roleCfg.roleCode === "promotor" && "Promotor eksekutif sponsor program."}
                            {roleCfg.roleCode === "sme" && "Subject Matter Expert / Kolaborator pendukung teknis."}
                            {roleCfg.roleCode === "divisi_ic" && "Tim pengelola Divisi Innovation Center."}
                            {roleCfg.roleCode === "admin_ic" && "Administrator sistem Innovation Center."}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {roleCfg.isIncluded ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Ikut Dihitung (ON)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                <X className="h-3 w-3 text-gray-400" />
                                <span>Tidak Dihitung (OFF)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant={roleCfg.isIncluded ? "destructive" : "default"}
                              disabled={isToggling}
                              onClick={() => handleToggleSprintRole(roleCfg.roleCode, roleCfg.isIncluded)}
                              className={`h-8 px-3 text-xs font-bold rounded-lg cursor-pointer ${
                                roleCfg.isIncluded
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : roleCfg.isIncluded ? (
                                "Nonaktifkan"
                              ) : (
                                "Aktifkan"
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: PENGATURAN BYPASS GERBANG FASE CV -> MV */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {canManageUsers && activeTab === "phase-gate-bypass" && (
        <div className="space-y-6">
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/40 border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-[#0F5132] border border-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold text-gray-900">
                    Konfigurasi Gerbang Fase Customer Validation → Market Validation
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 mt-1">
                    Atur role mana saja yang diizinkan mengakses menu Market Validation, mengadopsi kartu MV, dan merencanakan rilis MVP meskipun Laporan Customer Validation belum berstatus &apos;Lanjut&apos;.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Nama Role &amp; Kode</th>
                      <th className="py-3.5 px-4">Deskripsi / Peruntukan</th>
                      <th className="py-3.5 px-4 text-center">Status Gerbang MV</th>
                      <th className="py-3.5 px-4 text-center">Aksi Toggle Bypass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {phaseGateBypassConfigs.map((roleCfg, idx) => {
                      const isToggling = togglingBypassRoleCode === roleCfg.roleCode;
                      const isAdminRole = roleCfg.roleCode === "admin_ic";

                      return (
                        <tr key={roleCfg.roleCode} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 text-center font-medium text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 text-xs">
                              {roleCfg.roleName}
                            </div>
                            <code className="text-[10px] text-gray-400 font-mono">
                              {roleCfg.roleCode}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {roleCfg.roleCode === "co_creator" && "Anggota tim inovator / co-creator pelaksana teknis inovasi."}
                            {roleCfg.roleCode === "coach" && "Innovation Coach pembimbing metodologi dan coaching tim."}
                            {roleCfg.roleCode === "inisiator" && "Inisiator pengusul ide proyek inovasi awal."}
                            {roleCfg.roleCode === "project_owner" && "Project Owner penanggung jawab bisnis dari unit kerja."}
                            {roleCfg.roleCode === "sponsor" && "Pimpinan unit kerja / Divisi Sponsor proyek."}
                            {roleCfg.roleCode === "promotor" && "Promotor eksekutif sponsor program inovasi."}
                            {roleCfg.roleCode === "sme" && "Subject Matter Expert / Collaborator pendukung teknis."}
                            {roleCfg.roleCode === "divisi_ic" && "Tim pengelola Divisi Innovation Center."}
                            {roleCfg.roleCode === "admin_ic" && "Administrator sistem Innovation Center (Selalu Bypass Otomatis)."}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {roleCfg.isBypass || isAdminRole ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Bisa Akses (Bypass ON)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                <Lock className="h-3 w-3 text-gray-400" />
                                <span>Terkunci (Harus Lanjut)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isAdminRole ? (
                              <span className="text-[11px] font-semibold text-gray-400 italic">
                                Selalu Aktif (Admin)
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant={roleCfg.isBypass ? "destructive" : "default"}
                                disabled={isToggling}
                                onClick={() => handleTogglePhaseGateBypass(roleCfg.roleCode, roleCfg.isBypass)}
                                className={`h-8 px-3 text-xs font-bold rounded-lg cursor-pointer ${
                                  roleCfg.isBypass
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : "bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
                                }`}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : roleCfg.isBypass ? (
                                  "Kunci Kembali"
                                ) : (
                                  "Izinkan Bypass"
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DIALOG: BUAT ROLE BARU (CUSTOM ROLE) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#0F5132]" />
              Buat Role Kustom Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Tambahkan role baru ke sistem. Role baru otomatis dimulai dengan seluruh izin Tanpa Akses.
            </DialogDescription>
          </DialogHeader>

          {createRoleError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{createRoleError}</span>
            </div>
          )}

          <form onSubmit={handleCreateCustomRole} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Nama Role *</label>
              <Input
                placeholder="Contoh: Auditor Internal / PIC Regional"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Scope Penugasan *</label>
              <select
                className="w-full h-9 rounded-lg border border-gray-300 text-xs px-2.5 bg-white font-medium"
                value={newRoleScope}
                onChange={(e) => setNewRoleScope(e.target.value as any)}
              >
                <option value="per_tim">Per Tim Inovator (Ditugaskan spesifik ke tim tertentu)</option>
                <option value="global">Global (Berlaku di seluruh tim / sistem program)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Deskripsi / Catatan (Opsional)</label>
              <Input
                placeholder="Deskripsi singkat fungsi role..."
                value={newRoleDeskripsi}
                onChange={(e) => setNewRoleDeskripsi(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateRoleOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={creatingRole}
                size="sm"
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
              >
                {creatingRole ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" />
                    Buat Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DIALOG: EDIT USER (NAMA & RESET PASSWORD) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              {canManageUsers ? "Edit Data Pengguna & Reset Password" : "Edit Nama Pengguna"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {canManageUsers ? (
                <>
                  Ubah nama tampilan atau setel ulang password untuk akun <strong>{editingUser?.email}</strong>.
                </>
              ) : (
                <>
                  Ubah nama tampilan untuk akun <strong>{editingUser?.email}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* Bagian 1: Ubah Nama */}
            <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Ubah Nama Pengguna</span>
              </div>

              {editNameMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    editNameMsg.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{editNameMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditName} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600">Nama Lengkap</label>
                  <Input
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    required
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingEditName}
                    size="sm"
                    className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold h-8"
                  >
                    {savingEditName ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simpan Nama"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Bagian 2: Reset Password */}
            {canManageUsers && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-blue-900">
                  <KeyRound className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold">Reset Password Akun</span>
                </div>

              {resetPasswordMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    resetPasswordMsg.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{resetPasswordMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveResetPassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600">Password Baru (Min 6 karakter)</label>
                  <div className="relative">
                    <Input
                      type={showResetPasswordVal ? "text" : "password"}
                      placeholder="Masukkan password baru..."
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      required
                      className="h-9 text-xs bg-white pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPasswordVal(!showResetPasswordVal)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      title={showResetPasswordVal ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showResetPasswordVal ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <Input
                      type={showResetConfirmPasswordVal ? "text" : "password"}
                      placeholder="Ulangi password baru..."
                      value={resetConfirmPasswordVal}
                      onChange={(e) => setResetConfirmPasswordVal(e.target.value)}
                      required
                      className="h-9 text-xs bg-white pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPasswordVal(!showResetConfirmPasswordVal)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      title={showResetConfirmPasswordVal ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showResetConfirmPasswordVal ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingResetPassword}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 flex items-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savingResetPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      "Setel Ulang Password"
                    )}
                  </Button>
                </div>
              </form>
            </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingUser(null)}
              className="text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DIALOG: DELETE USER (SMART DELETE) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Hapus Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Konfirmasi proses penghapusan akun <strong>{deletingUser?.nama}</strong> ({deletingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {checkingRefs ? (
              <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#0F5132]" />
                <span>Memeriksa keterkaitan data riwayat pengguna...</span>
              </div>
            ) : userRefInfo ? (
              <div className="space-y-3">
                {userRefInfo.mode === "can_hard_delete" ? (
                  <div className="p-3.5 bg-green-50 rounded-xl border border-green-200 text-xs text-green-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-700" />
                      Aman untuk Dihapus Permanen
                    </div>
                    <p className="text-[11px] text-green-800 leading-relaxed">
                      Pengguna ini belum memiliki riwayat aktivitas audit log atau penugasan tim. Akun dapat dihapus secara total dari database dan Supabase Auth.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      Memiliki Riwayat Aktivitas & Penugasan
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Pengguna ini tercatat memiliki referensi data:
                    </p>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-950 font-medium">
                      <li>{userRefInfo.counts.auditLogs} aktivitas di Log Audit</li>
                      <li>{userRefInfo.counts.anggotaTim} catatan di Anggota Tim</li>
                      <li>{userRefInfo.counts.userRoleTim} penugasan Role Tim</li>
                    </ul>
                    <p className="text-[11px] text-amber-800 italic pt-1">
                      Untuk menjaga integritas data historis, akun akan <strong>dinonaktifkan secara aman</strong> dan hak akses timnya dicabut, bukan dihapus keras.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingUser(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={deletingLoading || checkingRefs}
              onClick={handleConfirmDelete}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-1.5"
            >
              {deletingLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memproses...
                </>
              ) : userRefInfo?.mode === "can_hard_delete" ? (
                "Hapus Permanen"
              ) : (
                "Nonaktifkan & Cabut Akses"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DIALOG: BUAT USER BARU */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#0F5132]" />
              Tambah User Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Buat akun login baru yang terhubung ke Supabase Auth & profil internal.
            </DialogDescription>
          </DialogHeader>

          {createUserError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{createUserError}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Nama Lengkap *</label>
              <Input
                placeholder="Contoh: Budi Santoso"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Alamat Email *</label>
              <Input
                type="email"
                placeholder="budi.santoso@pegadaian.co.id"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Password Baru *</label>
                <div className="relative">
                  <Input
                    type={showNewUserPassword ? "text" : "password"}
                    placeholder="Min 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-9 text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showNewUserPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showNewUserPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Konfirmasi Password *</label>
                <div className="relative">
                  <Input
                    type={showNewUserConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    required
                    className="h-9 text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserConfirmPassword(!showNewUserConfirmPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showNewUserConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showNewUserConfirmPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateUserOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={creatingUser}
                size="sm"
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
              >
                {creatingUser ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Membuat User...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Simpan User Baru
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DIALOG: PENUGASAN ROLE PENGGUNA */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Tetapkan Role Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Pilih pengguna, role yang diinginkan, dan tim sasaran.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignRole} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Pengguna</label>
              <select
                className="w-full h-9 rounded-lg border border-gray-300 text-xs px-2.5 bg-white"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">-- Pilih Pengguna --</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Role</label>
              <select
                className="w-full h-9 rounded-lg border border-gray-300 text-xs px-2.5 bg-white"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                required
              >
                <option value="">-- Pilih Role --</option>
                {rolesList.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.namaRole} ({r.scope}) {!r.isDefault ? "[Custom]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Scope Tim Inovator <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              <select
                className="w-full h-9 rounded-lg border border-gray-300 text-xs px-2.5 bg-white"
                value={selectedTimId}
                onChange={(e) => setSelectedTimId(e.target.value)}
              >
                <option value="">-- Global / Seluruh Tim --</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAssignOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savingAssign}
                size="sm"
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold"
              >
                {savingAssign ? "Menyimpan..." : "Simpan Penugasan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
