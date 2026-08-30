'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { searchUsersAction, createUserAction } from '@/app/actions/user';
import { User, UserPlus, Check, ChevronsUpDown, Search, X, Loader2, KeyRound, Mail, Eye, EyeOff } from 'lucide-react';

export type SelectedUser = {
  id: string;
  nama: string;
  email: string;
};

interface UserSelectComboboxProps {
  value: string | null;
  selectedUserData?: SelectedUser | null;
  onChange: (user: SelectedUser | null) => void;
  placeholder?: string;
  disabled?: boolean;
  timId?: string;
  users?: SelectedUser[];
  allowCreateNew?: boolean;
}

export function UserSelectCombobox({
  value,
  selectedUserData,
  onChange,
  placeholder = 'Pilih Akun User...',
  disabled = false,
  timId,
  users,
  allowCreateNew = true,
}: UserSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userList, setUserList] = useState<SelectedUser[]>(users || []);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dialog state for "+ Buat User Baru"
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('gadai123');
  const [newConfirmPassword, setNewConfirmPassword] = useState('gadai123');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Load user list on open or query change
  useEffect(() => {
    if (users) {
      if (!searchQuery.trim()) {
        setUserList(users);
      } else {
        const q = searchQuery.toLowerCase().trim();
        setUserList(
          users.filter(
            (u) =>
              (u.nama && u.nama.toLowerCase().includes(q)) ||
              (u.email && u.email.toLowerCase().includes(q))
          )
        );
      }
      setLoading(false);
      return;
    }

    if (!open) return;
    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      const res = await searchUsersAction(searchQuery);
      if (isMounted) {
        if (res.success && res.users) {
          setUserList(res.users);
        }
        setLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, searchQuery, users]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelectUser = (user: SelectedUser) => {
    onChange(user);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newNama.trim()) {
      setCreateError('Nama lengkap wajib diisi.');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setCreateError('Email tidak valid.');
      return;
    }
    if (newPassword.length < 6) {
      setCreateError('Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setCreateError('Konfirmasi password tidak cocok.');
      return;
    }

    setCreating(true);
    const res = await createUserAction({
      nama: newNama,
      email: newEmail,
      password: newPassword,
      timId,
    });

    if (res.success && res.user) {
      onChange(res.user);
      setCreateDialogOpen(false);
      setOpen(false);
      setNewNama('');
      setNewEmail('');
      setNewPassword('gadai123');
      setNewConfirmPassword('gadai123');
    } else {
      setCreateError(res.error || 'Gagal membuat user baru.');
    }
    setCreating(false);
  };

  // Find currently display label
  const currentUser = (users || userList).find((u) => u.id === value) || selectedUserData;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Combobox Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0F5132]/20 focus:border-[#0F5132] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed shadow-2xs text-left h-9"
      >
        <div className="flex items-center gap-2 truncate">
          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          {currentUser ? (
            <span className="font-semibold text-gray-900 truncate">
              {currentUser.nama} <span className="text-gray-400 font-normal">({currentUser.email})</span>
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {currentUser && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (userList.length > 0) {
                      handleSelectUser(userList[0]);
                    }
                  }
                }}
                placeholder="Cari nama atau email user..."
                className="pl-8 h-8 text-xs border-gray-200 bg-white"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {loading ? (
              <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0F5132]" />
                <span>Mencari data user...</span>
              </div>
            ) : userList.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">
                Tidak ada user yang cocok dengan &quot;{searchQuery}&quot;.
              </div>
            ) : (
              userList.map((u) => {
                const isSelected = u.id === value;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-[#0F5132]/10 text-[#0F5132] font-bold'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-semibold text-gray-900 truncate">{u.nama}</div>
                      <div className="text-[11px] text-gray-500 font-mono truncate">{u.email}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#0F5132] shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Create User Button Footer */}
          {allowCreateNew && (
            <div className="p-1.5 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreateDialogOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-[#0F5132] hover:bg-[#0F5132]/10 transition-colors border border-dashed border-[#0F5132]/30 bg-white"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#0F5132]" />
                <span>+ Buat User Baru</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mini-Form Dialog: Tambah User Baru */}
      {allowCreateNew && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#0F5132]" />
              Tambah User Akun Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Buat akun pengguna baru langsung ke sistem. User ini dapat login dan mengakses tim sesuai perannya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewUser} className="space-y-4 pt-2">
            {createError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-200">
                {createError}
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
                <div className="relative">
                  <Input
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-xs font-mono pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Konfirmasi Password</label>
                <div className="relative">
                  <Input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    className="h-9 text-xs font-mono pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              * Akun akan langsung aktif (`email_confirm: true`) sehingga pengguna dapat langsung login.
            </p>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={creating}
                size="sm"
                className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-bold gap-1.5"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Buat & Pilih User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
