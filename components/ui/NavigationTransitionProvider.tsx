"use client";

import React, {
  createContext,
  useContext,
  useTransition,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { CenteredPageLoader } from "./CenteredPageLoader";
import { toast } from "./ToastProvider";

interface NavigationContextType {
  navigate: (href: string) => void;
  isPending: boolean;
}

const NavigationContext = createContext<NavigationContextType>({
  navigate: () => {},
  isPending: false,
});

export function useAppNavigation() {
  return useContext(NavigationContext);
}

export function NavigationTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [showLoader, setShowLoader] = useState(false);

  // Ref untuk melacak status navigasi & jaring pengaman 2 lapis
  const pendingTargetRef = useRef<string | null>(null);
  const lastAttemptedHrefRef = useRef<string | null>(null);
  const hardFailSafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsPendingRef = useRef<boolean>(false);
  const isRecoveringRef = useRef<boolean>(false);
  const hasShownPendingToastRef = useRef<boolean>(false);

  // Bersihkan hard fail-safe timer (Lapis 2)
  const clearHardFailSafe = useCallback(() => {
    if (hardFailSafeTimerRef.current) {
      clearTimeout(hardFailSafeTimerRef.current);
      hardFailSafeTimerRef.current = null;
    }
  }, []);

  // Eksekutor pemulihan otomatis terkoordinasi (dengan multi-level defensif try-catch)
  const triggerRecovery = useCallback(
    (targetHref: string | null) => {
      try {
        if (isRecoveringRef.current) return;
        isRecoveringRef.current = true;

        try {
          clearHardFailSafe();
        } catch {
          // Abaikan error timer cleanup
        }

        try {
          setShowLoader(false);
        } catch {
          // Abaikan error UI loader
        }

        // Tampilkan toast secara aman tanpa memblokir aksi redirect
        try {
          toast.error(
            "Navigasi terhenti, memuat ulang halaman...",
            "Gagal Berpindah Halaman"
          );
        } catch (toastErr) {
          console.warn("[NavigationRecovery] Gagal menampilkan toast error:", toastErr);
        }

        // Eksekusi penyelamat utama (hard redirect ke target atau reload)
        if (targetHref) {
          window.location.assign(targetHref);
        } else {
          window.location.reload();
        }
      } catch (outerErr) {
        console.error("[NavigationRecovery] Terjadi exception di level luar, fallback ke reload:", outerErr);
        // Jaring pengaman terakhir mutlak: hard reload darurat
        try {
          window.location.reload();
        } catch {
          window.location.href = window.location.href;
        }
      }
    },
    [clearHardFailSafe]
  );

  // Ketika pathname berubah (navigasi berhasil selesai), bersihkan semua state & timer
  useEffect(() => {
    clearHardFailSafe();
    pendingTargetRef.current = null;
    lastAttemptedHrefRef.current = null;
    isRecoveringRef.current = false;
    hasShownPendingToastRef.current = false;
    setShowLoader(false);
  }, [pathname, clearHardFailSafe]);

  // Cleanup timer saat unmount
  useEffect(() => {
    return () => {
      clearHardFailSafe();
    };
  }, [clearHardFailSafe]);

  // Eksekutor navigasi terkelola
  const executeNavigation = useCallback(
    (href: string) => {
      // 0. Simpan target terakhir yang dicoba (sebelum guard apa pun)
      lastAttemptedHrefRef.current = href;

      // 1. Abaikan jika sudah berada di rute ini
      if (pathname === href || pathname === href.split("?")[0]) {
        return;
      }

      // 2. Guard klik-duplikat: jika target SAMA dengan yang sedang dimuat, abaikan (cegah request kembar)
      if (pendingTargetRef.current === href) {
        if (!hasShownPendingToastRef.current) {
          hasShownPendingToastRef.current = true;
          toast.info(
            "Masih memuat halaman sebelumnya, mohon tunggu...",
            "Sedang Proses"
          );
        }
        return;
      }

      // 3. Target BARU (berbeda dari yang sedang dimuat):
      hasShownPendingToastRef.current = false;
      pendingTargetRef.current = href;
      isRecoveringRef.current = false;

      // LAPIS 2: Pasang Hard Fail-Safe Timer 4 detik (HANYA SEKALI per target baru, kebal klik berulang)
      clearHardFailSafe();
      hardFailSafeTimerRef.current = setTimeout(() => {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : pathname;
        const isArrived =
          currentPath === href ||
          currentPath === href.split("?")[0] ||
          pathname === href ||
          pathname === href.split("?")[0];

        if (!isArrived) {
          triggerRecovery(href);
        }
      }, 4000);

      // 4. Jalankan transisi navigasi Next.js
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router, clearHardFailSafe, triggerRecovery]
  );

  const navigate = useCallback(
    (href: string) => {
      executeNavigation(href);
    },
    [executeNavigation]
  );

  // Tangkap seluruh klik link internal
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const download = anchor.getAttribute("download");

      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !href.startsWith("/api") &&
        !href.startsWith("#") &&
        !download &&
        (!targetAttr || targetAttr === "_self") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey &&
        e.button === 0
      ) {
        if (pathname === href || pathname === href.split("?")[0]) {
          e.preventDefault();
          return;
        }

        if (pendingTargetRef.current === href) {
          e.preventDefault();
          if (!hasShownPendingToastRef.current) {
            hasShownPendingToastRef.current = true;
            toast.info(
              "Masih memuat halaman sebelumnya, mohon tunggu...",
              "Sedang Proses"
            );
          }
          return;
        }

        e.preventDefault();
        executeNavigation(href);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, executeNavigation]);

  // Efek kontrol loader visual (muncul setelah 150ms agar transisi instan tidak flicker)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPending) {
      timer = setTimeout(() => {
        setShowLoader(true);
      }, 150);
    } else {
      setShowLoader(false);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isPending]);

  // LAPIS 1: Recovery Instan saat Transisi Dibatalkan (isPending: true -> false tanpa perubahan pathname)
  useEffect(() => {
    const wasPending = prevIsPendingRef.current;
    prevIsPendingRef.current = isPending;

    if (wasPending && !isPending) {
      const target = lastAttemptedHrefRef.current;
      if (target) {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : pathname;
        const isArrived =
          currentPath === target ||
          currentPath === target.split("?")[0] ||
          pathname === target ||
          pathname === target.split("?")[0];

        if (!isArrived) {
          // BUKTI DEFINITIF: React membatalkan transisi (misal error #412), isPending drop ke false
          triggerRecovery(target);
        }
      }
    }
  }, [isPending, pathname, triggerRecovery]);

  const contextValue = useMemo(
    () => ({ navigate, isPending }),
    [navigate, isPending]
  );

  return (
    <NavigationContext.Provider value={contextValue}>
      {showLoader && <CenteredPageLoader text="Sedang proses....." />}
      {children}
    </NavigationContext.Provider>
  );
}
