"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkUserMustChangePasswordAction } from "@/app/actions/auth";
import { Sparkles, Lock, Mail, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) {
        const mustChange = await checkUserMustChangePasswordAction(user.email);
        if (mustChange) {
          router.replace("/ganti-password");
        } else {
          router.replace("/dashboard");
        }
      }
    });
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Gagal masuk. Periksa email dan password Anda.");
      } else {
        const mustChange = await checkUserMustChangePasswordAction(email);
        if (mustChange) {
          router.push("/ganti-password");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0A3822] to-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F5132] border border-[#E6CA65]/30 shadow-xl shadow-black/40">
            <Sparkles className="h-8 w-8 text-[#E6CA65]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            PIA Incubator App
          </h1>
          <p className="text-sm text-green-200/90 font-medium">
            Program Inkubasi Pegadaian Innovation Award Season 12
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-white/10 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4 text-center">
            <CardTitle className="text-xl font-bold text-gray-900">
              Masuk ke Portal
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Gunakan akun resmi yang terdaftar untuk mengakses program inkubasi
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Email Korporat
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    required
                    placeholder="nama@pegadaian.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Kata Sandi
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#0F5132] hover:bg-[#1B7A4D] text-white font-semibold flex items-center justify-center gap-2 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Masuk...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
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
