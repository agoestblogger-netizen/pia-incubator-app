"use client";

import Link from "next/link";
import { Sparkles, LogOut, Bell, KeyRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SidebarDrawer } from "./SidebarDrawer";
import type { UserProfile } from "@/lib/auth/rbac";
import { useState, useRef, useEffect } from "react";

export function Navbar({
  user,
  taskCount = 0,
  adminPermissions,
}: {
  user?: UserProfile | null;
  taskCount?: number;
  adminPermissions?: {
    canManageUsers?: boolean;
    canCreateUser?: boolean;
    canEditUserName?: boolean;
    canAccessUserRoles?: boolean;
    canCreateTeam?: boolean;
    canImport?: boolean;
    canReset?: boolean;
  };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F5132] text-white shadow-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section: Hamburger Sidebar Trigger & Brand Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Drawer Trigger */}
          <SidebarDrawer user={user} taskCount={taskCount} adminPermissions={adminPermissions} />

          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20 shadow-inner group-hover:bg-white/20 transition-all">
              <Sparkles className="h-5 w-5 text-[#E6CA65]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">
                  PIA Incubator
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#9C7A2E] text-white px-1.5 py-0.5 rounded shadow-xs">
                  Season 12
                </span>
              </div>
              <p className="text-[11px] text-green-100/80 font-medium">
                Pegadaian Innovation Award
              </p>
            </div>
          </Link>
        </div>

        {/* Right Section: User Profile & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Notification Task Bell */}
              <Link href="/tugas" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 hover:text-white relative"
                  title="Tugas Saya"
                >
                  <Bell className="h-4 w-4" />
                  {taskCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0F5132]">
                      {taskCount > 99 ? "99+" : taskCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/10 transition-all cursor-pointer"
                  title="Akun saya"
                >
                  <div className="hidden md:block text-right">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {user.nama}
                    </p>
                    <p className="text-[11px] text-green-200">{user.email}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-[#1B7A4D] border border-white/30 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    {user.nama.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-white/70 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 bg-[#F0F7F1] border-b border-gray-100">
                      <p className="text-xs font-bold text-[#0B3D2E] truncate">{user.nama}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Ganti Password */}
                    <Link
                      href="/ganti-password"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-[#F0F7F1] hover:text-[#0F5132] transition-colors"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-[#3E9463]" />
                      Ganti Password
                    </Link>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Keluar */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
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
