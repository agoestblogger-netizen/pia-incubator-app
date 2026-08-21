"use client";

import Link from "next/link";
import { Sparkles, LogOut, User as UserIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Navbar({
  user,
}: {
  user?: { nama: string; email: string; globalRoles: string[] } | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isAdmin = user?.globalRoles.includes("admin_ic");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-[#0F5132] text-white shadow-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20 shadow-inner group-hover:bg-white/20 transition-all">
              <Sparkles className="h-5 w-5 text-[#E6CA65]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  PIA Incubator
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#9C7A2E] text-white px-1.5 py-0.5 rounded">
                  Season 12
                </span>
              </div>
              <p className="text-[11px] text-green-100/80 font-medium">
                Pegadaian Innovation Award
              </p>
            </div>
          </Link>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin/roles">
              <Button
                variant="gold"
                size="sm"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Panel RBAC & Role</span>
              </Button>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3 border-l border-white/20 pl-3">
              <div className="hidden md:block text-right">
                <p className="text-xs font-semibold text-white leading-tight">
                  {user.nama}
                </p>
                <p className="text-[11px] text-green-200">{user.email}</p>
              </div>

              <div className="h-8 w-8 rounded-full bg-[#1B7A4D] border border-white/30 flex items-center justify-center text-white font-bold text-xs">
                {user.nama.charAt(0).toUpperCase()}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-white/10 hover:text-white"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-[#0F5132] font-semibold hover:bg-gray-100"
              >
                Masuk
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
