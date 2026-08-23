"use client";

import Link from "next/link";
import { Sparkles, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SidebarDrawer } from "./SidebarDrawer";
import type { UserProfile } from "@/lib/auth/rbac";

export function Navbar({
  user,
  taskCount = 0,
}: {
  user?: UserProfile | null;
  taskCount?: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
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
          <SidebarDrawer user={user} taskCount={taskCount} />

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

              <div className="hidden md:block text-right">
                <p className="text-xs font-semibold text-white leading-tight">
                  {user.nama}
                </p>
                <p className="text-[11px] text-green-200">{user.email}</p>
              </div>

              <div className="h-9 w-9 rounded-full bg-[#1B7A4D] border border-white/30 flex items-center justify-center text-white font-bold text-xs shadow-xs">
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
