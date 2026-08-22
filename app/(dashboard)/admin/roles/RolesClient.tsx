"use client";

import { useState } from "react";
import {
  toggleRolePermissionAction,
  assignUserRoleTimAction,
  removeUserRoleTimAction,
} from "@/app/actions/admin-roles";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Shield, Users, Plus, Trash2, CheckCircle2 } from "lucide-react";

export function RolesClient({ initialData }: { initialData: any }) {
  const [rolePermissions, setRolePermissions] = useState<any[]>(initialData.rolePermissions || []);
  const [userRoles, setUserRoles] = useState<any[]>(initialData.userRoles || []);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedTimId, setSelectedTimId] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const roles = initialData.roles || [];
  const permissions = initialData.permissions || [];
  const usersList = initialData.users || [];
  const teams = initialData.teams || [];

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
      setMsg("Penugasan role pengguna berhasil!");
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
      setMsg("Penugasan role berhasil dihapus!");
    } else {
      alert(res.error || "Gagal menghapus penugasan role.");
    }
  };

  return (
    <div className="space-y-8">
      {msg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{msg}</span>
        </div>
      )}

      {/* Bagian 1: Penugasan Role User ke Tim */}
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0F5132]" />
              <span>Penugasan Role Pengguna & Tim (user_role_tim)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Tetapkan siapa yang bertindak sebagai Project Owner, Sponsor, Promotor, Coach, atau SME di tiap tim
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsAssignOpen(true)}
            size="sm"
            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs gap-1.5 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Tugaskan Role ke User</span>
          </Button>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              Belum ada penugasan role pengguna.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="p-2.5 font-semibold text-gray-700">Nama Pengguna</th>
                    <th className="p-2.5 font-semibold text-gray-700">Email</th>
                    <th className="p-2.5 font-semibold text-gray-700">Role</th>
                    <th className="p-2.5 font-semibold text-gray-700">Scope Tim Inovator</th>
                    <th className="p-2.5 font-semibold text-gray-700 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userRoles.map((ur: any) => (
                    <tr key={ur.id} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-bold text-gray-800">{ur.userName}</td>
                      <td className="p-2.5 text-gray-500">{ur.userEmail}</td>
                      <td className="p-2.5">
                        <Badge variant="default" className="text-[10px]">
                          {ur.roleName}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {ur.timInovatorId ? (
                          <span className="font-semibold text-gray-700">Per Tim</span>
                        ) : (
                          <Badge variant="gold" className="text-[10px]">Global</Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRole(ur.id)}
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bagian 2: Matriks Hak Akses Modul */}
      <Card className="border-gray-200 overflow-hidden">
        <CardHeader className="bg-gray-50/60 pb-3 border-b border-gray-200">
          <CardTitle className="text-sm font-bold text-gray-900">
            Matriks Hak Akses Modul (Live Toggle)
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Klik pada kotak centang untuk memberikan atau mencabut hak akses pada role tertentu
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/50">
                <th className="p-3 font-bold text-gray-700 w-64">Modul & Izin</th>
                {roles.map((r: any) => (
                  <th
                    key={r.id}
                    className="p-3 font-bold text-gray-800 text-center whitespace-nowrap"
                  >
                    {r.namaRole}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permissions.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-3">
                    <span className="font-bold text-gray-900 block">{p.deskripsi}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {p.modul} &bull; {p.kodePermission}
                    </span>
                  </td>

                  {roles.map((r: any) => {
                    const allowed = isAllowed(r.id, p.id) || r.kodeRole === "admin_ic";
                    const isAdmin = r.kodeRole === "admin_ic";

                    return (
                      <td key={r.id} className="p-3 text-center">
                        <button
                          type="button"
                          disabled={isAdmin}
                          onClick={() => handleToggle(r.id, p.id, r.kodeRole)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            allowed
                              ? "bg-green-100 text-green-800 hover:bg-green-200 font-bold"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          } ${isAdmin ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                          title={isAdmin ? "Admin memiliki akses penuh" : "Klik untuk toggle"}
                        >
                          {allowed ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog Assign Role */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tugaskan Role ke Pengguna</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignRole} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Pilih Pengguna *</label>
              <select
                className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">-- Pilih Pengguna Terdaftar --</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nama} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Pilih Role *</label>
              <select
                className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Pilih Tim Inovator (Opsional untuk Role Global)
              </label>
              <select
                className="w-full h-10 px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg"
                value={selectedTimId}
                onChange={(e) => setSelectedTimId(e.target.value)}
              >
                <option value="">-- Role Global (Semua Tim) --</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={savingAssign} className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white">
                {savingAssign ? "Menyimpan..." : "Simpan Penugasan Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
