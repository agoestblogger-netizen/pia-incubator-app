"use client";

import { useState } from "react";
import { toggleRolePermissionAction } from "@/app/actions/admin-roles";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Lock } from "lucide-react";

export function RolesClient({ initialData }: { initialData: any }) {
  const [rolePermissions, setRolePermissions] = useState<any[]>(initialData.rolePermissions || []);
  const [updating, setUpdating] = useState<string | null>(null);

  const roles = initialData.roles || [];
  const permissions = initialData.permissions || [];

  const isAllowed = (roleId: string, permissionId: string) => {
    const found = rolePermissions.find(
      (rp) => rp.roleId === roleId && rp.permissionId === permissionId
    );
    return found ? found.diizinkan : false;
  };

  const handleToggle = async (roleId: string, permissionId: string, roleCode: string) => {
    if (roleCode === "admin_ic") return; // Admin IC always full access

    const current = isAllowed(roleId, permissionId);
    const nextVal = !current;
    const key = `${roleId}_${permissionId}`;
    setUpdating(key);

    // Optimistic update
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
    setUpdating(null);
  };

  return (
    <div className="space-y-6">
      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {roles.map((r: any) => (
          <Card key={r.id} className="border-gray-200">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <Badge variant={r.scope === "global" ? "gold" : "default"} className="text-[10px]">
                  {r.scope}
                </Badge>
                {r.isDefault && (
                  <span className="text-[10px] text-gray-400 font-semibold">Default</span>
                )}
              </div>
              <CardTitle className="text-sm font-bold mt-1 text-gray-900">
                {r.namaRole}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-gray-500 line-clamp-2">
                {r.deskripsi || "Tanpa deskripsi"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix Table */}
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
    </div>
  );
}
