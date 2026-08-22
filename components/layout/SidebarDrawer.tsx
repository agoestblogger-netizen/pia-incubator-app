'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  FolderArchive,
  Users,
  ShieldCheck,
  UploadCloud,
  PlusCircle,
  LogOut,
  Sparkles,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/auth/rbac';

export function SidebarDrawer({ user }: { user?: UserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isAdmin = user?.globalRoles.includes('admin_ic');
  const userTeams = user?.timRoles || [];

  // Close sidebar on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Hamburger Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors"
        aria-label="Buka Menu Navigasi"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Dimmed Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-over Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#0F5132] text-white">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20">
              <Sparkles className="h-4.5 w-4.5 text-[#E6CA65]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight">PIA Incubator</span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#9C7A2E] text-white px-1.5 py-0.2 rounded">
                  S12
                </span>
              </div>
              <p className="text-[10px] text-green-100/80 font-medium">PT Pegadaian</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Tutup Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body — Structured Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Grup 1: Menu Utama */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Menu Utama
            </div>

            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive('/dashboard') && !pathname.includes('/tim-baru')
                  ? 'bg-emerald-50 text-[#0F5132] font-bold border border-emerald-100 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${isActive('/dashboard') && !pathname.includes('/tim-baru') ? 'text-[#0F5132]' : 'text-gray-400'}`} />
              <span>Dashboard Program</span>
            </Link>

            <Link
              href="/dossier"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive('/dossier')
                  ? 'bg-emerald-50 text-[#0F5132] font-bold border border-emerald-100 shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
              }`}
            >
              <FolderArchive className={`h-4 w-4 ${isActive('/dossier') ? 'text-[#0F5132]' : 'text-gray-400'}`} />
              <span>Dossier Arsip PIA</span>
            </Link>
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-100 mx-1" />

          {/* Grup 2: Tim Saya */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tim Saya ({userTeams.length})
              </span>
              {isAdmin && (
                <Link
                  href="/dashboard/tim-baru"
                  className="text-[10px] text-[#0F5132] hover:underline font-semibold flex items-center gap-0.5"
                >
                  <PlusCircle className="h-3 w-3" />
                  Baru
                </Link>
              )}
            </div>

            {userTeams.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-400 italic">
                Belum terdaftar di tim inovasi tertentu.
              </div>
            ) : (
              <div className="space-y-1">
                {userTeams.map((tr, idx) => {
                  const isTeamActive = pathname.startsWith(`/tim/${tr.timId}`);
                  return (
                    <Link
                      key={idx}
                      href={`/tim/${tr.timId}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        isTeamActive
                          ? 'bg-emerald-50 text-[#0F5132] font-bold border border-emerald-100'
                          : 'text-gray-700 hover:bg-gray-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="h-7 w-7 rounded-lg bg-green-100/80 text-[#0F5132] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {tr.timNama ? tr.timNama.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate font-semibold text-xs text-gray-900" title={tr.timNama}>
                            {tr.timNama || `Tim ${tr.timId.slice(0, 6)}`}
                          </p>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {tr.roleName}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Separator */}
          {isAdmin && (
            <>
              <div className="h-px bg-gray-100 mx-1" />

              {/* Grup 3: Administrasi */}
              <div className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Administrasi IC
                </div>

                <Link
                  href="/admin/import"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive('/admin/import')
                      ? 'bg-emerald-50 text-[#0F5132] font-bold border border-emerald-100 shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  <UploadCloud className={`h-4 w-4 ${isActive('/admin/import') ? 'text-[#0F5132]' : 'text-gray-400'}`} />
                  <span>Import Calon Peserta</span>
                </Link>

                <Link
                  href="/admin/roles"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive('/admin/roles')
                      ? 'bg-emerald-50 text-[#0F5132] font-bold border border-emerald-100 shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  <ShieldCheck className={`h-4 w-4 ${isActive('/admin/roles') ? 'text-[#0F5132]' : 'text-gray-400'}`} />
                  <span>Kelola User & Role (RBAC)</span>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer — Profile & Logout */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/75 space-y-3">
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-9 w-9 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {user.nama.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-xs text-gray-900 truncate">{user.nama}</p>
                  <p className="text-[10px] text-gray-500 truncate font-mono">{user.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors shrink-0"
                title="Keluar dari Aplikasi"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="block">
              <Button className="w-full bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs h-9 font-semibold">
                Masuk ke Portal
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
