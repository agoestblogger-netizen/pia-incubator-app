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

  // Ref untuk melacak URL target navigasi yang sedang berlangsung
  const pendingTargetRef = useRef<string | null>(null);
  const lastAttemptedHrefRef = useRef<string | null>(null);
  const failSafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownPendingToastRef = useRef<boolean>(false);

  // Bersihkan fail-safe timer
  const clearFailSafe = useCallback(() => {
    if (failSafeTimerRef.current) {
      clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
    }
  }, []);

  // Ketika pathname berubah (navigasi berhasil selesai), bersihkan semua state
  useEffect(() => {
    clearFailSafe();
    pendingTargetRef.current = null;
    lastAttemptedHrefRef.current = null;
    hasShownPendingToastRef.current = false;
    setShowLoader(false);
  }, [pathname, clearFailSafe]);

  // Eksekutor navigasi terkelola
  const executeNavigation = useCallback(
    (href: string) => {
      // 0. Simpan target terakhir yang dicoba (kebal reset, sebelum guard apa pun)
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

      // 3. Jika target BERBEDA: batalkan timer lama dan pasang target baru
      clearFailSafe();
      hasShownPendingToastRef.current = false;
      pendingTargetRef.current = href;

      // 4. Fail-safe timeout 3 detik: jika transisi belum selesai dalam 3 detik, tangani kegagalan
      failSafeTimerRef.current = setTimeout(() => {
        if (pendingTargetRef.current === href) {
          const failedTarget = href;
          pendingTargetRef.current = null;
          hasShownPendingToastRef.current = false;
          setShowLoader(false);

          // Tampilkan pesan error jelas kepada user
          toast.error(
            "Navigasi lambat atau terhenti. Mengalihkan halaman secara otomatis...",
            "Koneksi Lambat"
          );

          // Retry otomatis via direct browser navigation agar user tidak terdampar di halaman asal
          window.location.assign(failedTarget);
        }
      }, 3000);

      // 5. Jalankan transisi navigasi Next.js
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router, clearFailSafe]
  );

  const navigate = useCallback(
    (href: string) => {
      executeNavigation(href);
    },
    [executeNavigation]
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Cari elemen <a> terdekat
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const download = anchor.getAttribute("download");

      // Hanya tangani link internal same-origin relatif tanpa modifier key
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
        // Abaikan jika klik rute yang sama persis
        if (pathname === href || pathname === href.split("?")[0]) {
          e.preventDefault();
          return;
        }

        // Guard klik-duplikat: abaikan jika target yang sama sedang dimuat
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
      clearFailSafe();
    };
  }, [pathname, executeNavigation, clearFailSafe]);

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

  // Watchdog independen: kebal terhadap klik berulang, hanya bergantung pada isPending
  useEffect(() => {
    if (isPending) {
      if (!watchdogTimerRef.current) {
        watchdogTimerRef.current = setTimeout(() => {
          toast.error(
            "Navigasi terhambat terlalu lama. Memuat ulang halaman...",
            "Koneksi Bermasalah"
          );
          const target = lastAttemptedHrefRef.current;
          if (target) {
            window.location.assign(target);
          } else {
            window.location.reload();
          }
        }, 5000); // 5 detik, lebih lama dari fail-safe per-klik (3 detik) supaya tidak tabrakan
      }
    } else {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    }

    return () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [isPending]);

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
