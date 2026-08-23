"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/app/actions/auth";
import { Sparkles, Lock, ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function GantiPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword === "gadai123") {
      setErrorMsg("Kata sandi baru tidak boleh sama dengan kata sandi default (gadai123).");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    const res = await changePasswordAction(newPassword);
    setLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } else {
      setErrorMsg(res.error || "Gagal mengubah kata sandi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0A3822] to-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F5132] border border-[#E6CA65]/30 shadow-xl shadow-black/40">
            <ShieldCheck className="h-8 w-8 text-[#E6CA65]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Ganti Kata Sandi Wajib
          </h1>
          <p className="text-xs text-green-200/90 font-medium">
            Pengamanan Akun Pengguna Baru — PIA Incubator App
          </p>
        </div>

        <Card className="border-white/10 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-lg font-bold text-gray-900">
              Buat Kata Sandi Baru
            </CardTitle>
            <CardDescription className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-left leading-relaxed">
              Akun Anda dibuat dengan kata sandi bawaan (<strong>gadai123</strong>). Demi keamanan data inovasi, silakan buat kata sandi baru pribadi Anda untuk melanjutkan.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}

            {isSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="text-sm font-bold text-gray-900">Kata Sandi Berhasil Diperbarui!</h3>
                <p className="text-xs text-gray-500">Mengarahkan Anda ke Dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Kata Sandi Baru *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Konfirmasi Kata Sandi Baru *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      required
                      placeholder="Ulangi kata sandi baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-semibold flex items-center justify-center gap-2 rounded-xl transition-all shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan Kata Sandi & Lanjut</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-green-100/60">
          Innovation Center &copy; {new Date().getFullYear()} PT Pegadaian
        </p>
      </div>
    </div>
  );
}
