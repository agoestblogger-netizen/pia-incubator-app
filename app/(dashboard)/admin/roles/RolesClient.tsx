"use client";

import { useState } from "react";
import {
  toggleRolePermissionAction,
  assignUserRoleTimAction,
  removeUserRoleTimAction,
} from "@/app/actions/admin-roles";
import {
  createUserAction,
  updateUserNameAction,
  resetUserPasswordAction,
  deleteUserSmartAction,
  toggleUserStatusAction,
  checkUserReferencesAction,
} from "@/app/actions/user";
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
} from "lucide-react";

export function RolesClient({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<"matrix" | "users">("matrix");

  // State for RBAC Matrix
  const [rolePermissions, setRolePermissions] = useState<any[]>(initialData.rolePermissions || []);
  const [userRoles, setUserRoles] = useState<any[]>(initialData.userRoles || []);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedTimId, setSelectedTimId] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // State for User Management
  const [usersList, setUsersList] = useState<any[]>(initialData.users || []);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // Create User State
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("password123");
  const [newConfirmPassword, setNewConfirmPassword] = useState("password123");
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
  const [savingResetPassword, setSavingResetPassword] = useState(false);
  const [resetPasswordMsg, setResetPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [userRefInfo, setUserRefInfo] = useState<any | null>(null);
  const [checkingRefs, setCheckingRefs] = useState(false);

  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const roles = initialData.roles || [];
  const permissions = initialData.permissions || [];
  const teams = initialData.teams || [];

  // Group permissions by modul
  const groupedPermissions = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.modul]) acc[p.modul] = [];
    acc[p.modul].push(p);
    return acc;
  }, {});

  const isAllowed = (roleId: string, permissionId: string) => {
    const found = rolePermissions.find(
      (rp) => rp.roleId === roleId && rp.permissionId === permissionId
    );
    return found ? found.diizinkan : false;
  };

  const handleToggle = async (roleId: string, permissionId: string, roleCode: string) => {
    if (roleCode === "admin_ic") return;

    const current = isAllowed(roleId, permissionId);
    const nextVal = !current;

    setRolePermissions((prev) => {
      const existing = prev.find((rp) => rp.roleId === roleId && rp.permissionId === permissionId);
      if (existing) {
        return prev.map((rp) =>
          rp.roleId === roleId && rp.permissionId === permissionId ? { ...rp, diizinkan: nextVal } : rp
        );
      }
      return [...prev, { roleId, permissionId, diizinkan: nextVal }];
    });

    await toggleRolePermissionAction(roleId, permissionId, nextVal);
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedRoleId) {
      alert("Harap pilih Pengguna dan Role.");
      return;
    }
    setSavingAssign(true);

    const res = await assignUserRoleTimAction({
      userId: selectedUserId,
      roleId: selectedRoleId,
      timInovatorId: selectedTimId || null,
    });

    if (res.success && res.data) {
      setMsg({ type: "success", text: "Penugasan role pengguna berhasil!" });
      setIsAssignOpen(false);
      window.location.reload();
    } else {
      alert(res.error || "Gagal menetapkan role.");
    }
    setSavingAssign(false);
  };

  const handleRemoveRole = async (id: string) => {
    if (!confirm("Hapus penugasan role ini?")) return;
    const res = await removeUserRoleTimAction(id);
    if (res.success) {
      setUserRoles(userRoles.filter((ur) => ur.id !== id));
      setMsg({ type: "success", text: "Penugasan role berhasil dihapus!" });
    } else {
      alert(res.error || "Gagal menghapus penugasan role.");
    }
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
    });

    if (res.success && res.user) {
      setUsersList((prev) => [res.user, ...prev]);
      setMsg({ type: "success", text: `User ${res.user.nama} berhasil dibuat!` });
      setIsCreateUserOpen(false);
      setNewNama("");
      setNewEmail("");
      setNewPassword("password123");
      setNewConfirmPassword("password123");
    } else {
      setCreateUserError(res.error || "Gagal membuat user.");
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
      setEditNameMsg({ type: "success", text: "Nama pengguna berhasil diperbarui!" });
    } else {
      setEditNameMsg({ type: "error", text: res.error || "Gagal memperbarui nama." });
    }
    setSavingEditName(false);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setResetPasswordMsg(null);

    if (resetPasswordVal.length < 6) {
      setResetPasswordMsg({ type: "error", text: "Password baru minimal 6 karakter." });
      return;
    }
    if (resetPasswordVal !== resetConfirmPasswordVal) {
      setResetPasswordMsg({ type: "error", text: "Konfirmasi password tidak cocok." });
      return;
    }

    setSavingResetPassword(true);
    const res = await resetUserPasswordAction(editingUser.id, resetPasswordVal);
    if (res.success) {
      setResetPasswordMsg({ type: "success", text: "Password berhasil di-reset!" });
      setResetPasswordVal("");
      setResetConfirmPasswordVal("");
    } else {
      setResetPasswordMsg({ type: "error", text: res.error || "Gagal me-reset password." });
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
        setMsg({ type: "success", text: res.message || "User berhasil dihapus permanen." });
      } else {
        setUsersList((prev) =>
          prev.map((u) => (u.id === deletingUser.id ? { ...u, statusAktif: false } : u))
        );
        setMsg({ type: "info", text: res.message || "User berhasil dinonaktifkan." });
      }
      setDeletingUser(null);
    } else {
      alert(res.error || "Gagal memproses penghapusan user.");
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
      setMsg({
        type: "success",
        text: `Status user ${user.nama} berhasil diubah menjadi ${nextStatus ? "Aktif" : "Non-Aktif"}.`,
      });
    } else {
      alert(res.error || "Gagal mengubah status user.");
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
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs ${
            msg.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : msg.type === "info"
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Top Tab Bar Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-6 pt-3 space-x-6">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "matrix"
              ? "border-[#0F5132] text-[#0F5132]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Matriks Hak Akses Role</span>
        </button>

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
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MATRIKS HAK AKSES ROLE */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "matrix" && (
        <div className="space-y-8">
          {/* Bagian 1: Matriks Permission */}
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-900">
                Matriks Hak Akses (Matrix Permissions)
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Klik ikon untuk mengaktifkan atau menonaktifkan izin. Admin Innovation Center selalu memiliki izin penuh di semua modul.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold">
                    <th className="p-3.5 border-r border-gray-200 w-80">Modul & Hak Akses</th>
                    {roles.map((r: any) => (
                      <th
                        key={r.id}
                        className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                          r.kodeRole === "admin_ic" ? "bg-amber-50/70 text-amber-900" : ""
                        }`}
                      >
                        <div>{r.namaRole}</div>
                        <span className="text-[10px] text-gray-400 font-mono font-normal">
                          {r.scope}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(groupedPermissions).map(([modul, perms]: [string, any]) => (
                    <tr key={modul} className="group">
                      <td colSpan={roles.length + 1} className="p-0">
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
                                {roles.map((r: any) => {
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
                    userRoles.map((ur: any) => {
                      const tim = teams.find((t: any) => t.id === ur.timInovatorId);
                      return (
                        <tr key={ur.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 font-semibold text-gray-900">{ur.userName}</td>
                          <td className="p-3 text-gray-500 font-mono text-[11px]">{ur.userEmail}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className="font-bold text-[11px] border-[#0F5132]/30 text-[#0F5132] bg-[#0F5132]/5"
                            >
                              {ur.roleName}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-600">
                            {tim ? tim.nama : <span className="text-gray-400 italic">Global (Semua Tim)</span>}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRole(ur.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                              title="Hapus Penugasan Role"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
      {/* TAB 2: KELOLA USER (USER MANAGEMENT) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* User Stats & Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari user berdasarkan nama / email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="pl-9 h-9 text-xs w-72 bg-white border-gray-200"
                />
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Total: <strong>{filteredUsers.length}</strong> pengguna
              </span>
            </div>

            <Button
              onClick={() => setIsCreateUserOpen(true)}
              className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Tambah User Baru
            </Button>
          </div>

          {/* Users Table Card */}
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold">
                    <th className="p-3.5">Nama Pengguna</th>
                    <th className="p-3.5">Email Korporat</th>
                    <th className="p-3.5 text-center">Status Akun</th>
                    <th className="p-3.5 text-center">Role / Tim Terhubung</th>
                    <th className="p-3.5 text-right">Aksi Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        Tidak ada data user ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => {
                      const userRolesForThisUser = userRoles.filter((ur: any) => ur.userId === u.id);
                      const uniqueTeamsCount = new Set(
                        userRolesForThisUser.filter((ur: any) => ur.timInovatorId).map((ur: any) => ur.timInovatorId)
                      ).size;

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                          {/* Nama */}
                          <td className="p-3.5 font-semibold text-gray-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {(u.nama || "U")
                                .split(" ")
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <span className="truncate">{u.nama}</span>
                          </td>

                          {/* Email */}
                          <td className="p-3.5 text-gray-600 font-mono text-[11px]">
                            {u.email}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                u.statusAktif
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.statusAktif ? "bg-green-600" : "bg-gray-400"
                                }`}
                              />
                              {u.statusAktif ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>

                          {/* Role & Teams */}
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold">
                              <Layers className="h-3.5 w-3.5 text-[#0F5132]" />
                              {uniqueTeamsCount} Tim ({userRolesForThisUser.length} Peran)
                            </span>
                          </td>

                          {/* Action Buttons: Edit, Toggle Active/Inactive, and Delete */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(u)}
                                className="h-8 text-xs font-semibold gap-1 text-gray-700 hover:text-[#0F5132] hover:border-[#0F5132]/40"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </Button>

                              {/* Toggle Status Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={togglingUserId === u.id}
                                onClick={() => handleToggleUserStatus(u)}
                                className={`h-8 text-xs font-semibold gap-1 ${
                                  u.statusAktif
                                    ? "text-amber-700 border-amber-200 hover:bg-amber-50"
                                    : "text-green-700 border-green-200 hover:bg-green-50"
                                }`}
                                title={u.statusAktif ? "Nonaktifkan Akses User" : "Aktifkan Akses User"}
                              >
                                {togglingUserId === u.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Power className="h-3 w-3" />
                                )}
                                <span>{u.statusAktif ? "Nonaktifkan" : "Aktifkan"}</span>
                              </Button>

                              {/* Delete Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDelete(u)}
                                className="h-8 text-xs font-semibold gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Hapus User (Smart Delete)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Hapus</span>
                              </Button>
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
      {/* MODAL DIALOG: EDIT USER & RESET PASSWORD */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Edit className="h-5 w-5 text-[#0F5132]" />
              Edit Data & Reset Password Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Perbarui nama profil atau setel ulang password login untuk akun ini.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6 divide-y divide-gray-100">
              {/* Bagian 1: Update Profil & Nama */}
              <form onSubmit={handleSaveEditName} className="space-y-4 pt-1">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#0F5132]" />
                  Informasi Profil Pengguna
                </h4>

                {editNameMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold border ${
                      editNameMsg.type === "success"
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {editNameMsg.text}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Email Korporat (Identitas Login)</label>
                  <Input
                    disabled
                    value={editingUser.email}
                    className="h-9 text-xs bg-gray-100 text-gray-600 font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-400 block">* Email terikat sebagai identitas login dan tidak dapat diubah.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Nama Lengkap</label>
                  <Input
                    required
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="h-9 text-xs"
                    placeholder="Nama Lengkap"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingEditName}
                    size="sm"
                    className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
                  >
                    {savingEditName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Simpan Perubahan Nama
                  </Button>
                </div>
              </form>

              {/* Bagian 2: Reset Password */}
              <form onSubmit={handleSaveResetPassword} className="space-y-4 pt-4">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-[#0F5132]" />
                  Reset Password Akun
                </h4>

                {resetPasswordMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold border ${
                      resetPasswordMsg.type === "success"
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {resetPasswordMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <KeyRound className="h-3 w-3 text-gray-400" />
                      Password Baru
                    </label>
                    <Input
                      required
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Konfirmasi Password</label>
                    <Input
                      required
                      type="password"
                      placeholder="Ketik ulang password"
                      value={resetConfirmPasswordVal}
                      onChange={(e) => setResetConfirmPasswordVal(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingResetPassword}
                    size="sm"
                    variant="outline"
                    className="border-[#0F5132] text-[#0F5132] hover:bg-[#0F5132]/10 text-xs font-bold gap-1.5"
                  >
                    {savingResetPassword ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                    Setel Ulang Password
                  </Button>
                </div>
              </form>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-gray-100">
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
      {/* MODAL DIALOG: HAPUS USER (SMART DELETE) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Konfirmasi Penghapusan User
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Sistem akan memverifikasi riwayat aktivitas dan keterhubungan tim sebelum eksekusi.
            </DialogDescription>
          </DialogHeader>

          {deletingUser && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1">
                <div className="font-bold text-gray-900">{deletingUser.nama}</div>
                <div className="text-gray-500 font-mono text-[11px]">{deletingUser.email}</div>
              </div>

              {checkingRefs ? (
                <div className="py-4 text-center text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0F5132]" />
                  <span>Memeriksa riwayat keterhubungan...</span>
                </div>
              ) : userRefInfo?.hasReferences ? (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-700" />
                    <span>Terdeteksi Riwayat Aktivitas ({userRefInfo.references.total} Entri)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    User ini sudah pernah terhubung ke riwayat tim / penugasan role / log aktivitas audit. Demi menjaga integritas data, user ini <strong>TIDAK akan dihapus permanen</strong>, melainkan <strong>otomatis dinonaktifkan</strong> sehingga tidak dapat login kembali.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-red-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4 text-red-700" />
                    <span>Hapus Permanen Akun (Belum Ada Aktivitas)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    User ini belum pernah terhubung ke aktivitas tim manapun. Akun akan <strong>dihapus permanen</strong> dari database dan autentikasi. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deletingLoading}
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
              className={`${
                userRefInfo?.hasReferences
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              } text-xs font-bold gap-1.5`}
            >
              {deletingLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memproses...
                </>
              ) : userRefInfo?.hasReferences ? (
                <>
                  <Power className="h-3.5 w-3.5" />
                  Konfirmasi Nonaktifkan
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Permanen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL DIALOG: TAMBAH USER BARU */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#0F5132]" />
              Tambah Akun Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Buat akun Supabase Auth dan profil pengguna baru. Akun langsung aktif tanpa verifikasi email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            {createUserError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-200">
                {createUserError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Nama Lengkap</label>
              <Input
                required
                placeholder="Contoh: Budi Santoso"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Mail className="h-3 w-3 text-gray-400" />
                Email Korporat Pegadaian
              </label>
              <Input
                required
                type="email"
                placeholder="nama.lengkap@pegadaian.co.id"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-gray-400" />
                  Password
                </label>
                <Input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Konfirmasi Password</label>
                <Input
                  required
                  type="password"
                  value={newConfirmPassword}
                  onChange={(e) => setNewConfirmPassword(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
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
                    Menyimpan...
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
      {/* MODAL DIALOG: PENUGASAN ROLE LAMA */}
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
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.namaRole} ({r.scope})
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
