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
      console.log(`[NAV_DEBUG clearHardFailSafe ${Date.now()}] Cleared hardFailSafeTimer`);
      clearTimeout(hardFailSafeTimerRef.current);
      hardFailSafeTimerRef.current = null;
    }
  }, []);

  // Eksekutor pemulihan otomatis terkoordinasi (dengan multi-level defensif try-catch)
  const triggerRecovery = useCallback(
    (targetHref: string | null) => {
      const now = Date.now();
      console.log(`[NAV_DEBUG triggerRecovery ENTER ${now}] targetHref=${targetHref}, isRecoveringRef=${isRecoveringRef.current}`);
      try {
        if (isRecoveringRef.current) {
          console.log(`[NAV_DEBUG triggerRecovery BLOCKED ${now}] Already recovering, skipping duplicate call`);
          return;
        }
        isRecoveringRef.current = true;

        try {
          clearHardFailSafe();
        } catch (e) {
          console.warn(`[NAV_DEBUG triggerRecovery clearHardFailSafe ERROR ${now}]`, e);
        }

        try {
          setShowLoader(false);
        } catch (e) {
          console.warn(`[NAV_DEBUG triggerRecovery setShowLoader ERROR ${now}]`, e);
        }

        // Tampilkan toast secara aman tanpa memblokir aksi redirect
        try {
          console.log(`[NAV_DEBUG triggerRecovery TOAST ${now}] Showing toast.error`);
          toast.error(
            "Navigasi terhenti, memuat ulang halaman...",
            "Gagal Berpindah Halaman"
          );
        } catch (toastErr) {
          console.warn(`[NAV_DEBUG triggerRecovery toastErr ${now}] Gagal menampilkan toast:`, toastErr);
        }

        // Eksekusi penyelamat utama (hard redirect ke target atau reload)
        if (targetHref) {
          console.log(`[NAV_DEBUG triggerRecovery REDIRECT ${now}] Executing window.location.assign("${targetHref}")`);
          window.location.assign(targetHref);
        } else {
          console.log(`[NAV_DEBUG triggerRecovery RELOAD ${now}] Executing window.location.reload()`);
          window.location.reload();
        }
      } catch (outerErr) {
        console.error(`[NAV_DEBUG triggerRecovery OUTER_EXCEPTION ${now}]`, outerErr);
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
    console.log(`[NAV_DEBUG useEffect[pathname] ${Date.now()}] Pathname changed to "${pathname}". Resetting states & timers.`);
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
      const now = Date.now();
      console.log(`[NAV_DEBUG executeNavigation START ${now}] href="${href}", pathname="${pathname}", pendingTargetRef="${pendingTargetRef.current}"`);

      // 0. Simpan target terakhir yang dicoba (sebelum guard apa pun)
      lastAttemptedHrefRef.current = href;
      console.log(`[NAV_DEBUG SET_REFS ${now}] lastAttemptedHrefRef="${href}"`);

      // 1. Abaikan jika sudah berada di rute ini
      const isAlreadyOnRoute = pathname === href || pathname === href.split("?")[0];
      if (isAlreadyOnRoute) {
        console.log(`[NAV_DEBUG executeNavigation GUARD_1_REJECT ${now}] Already on route "${href}", aborting.`);
        return;
      }

      // 2. Guard klik-duplikat: jika target SAMA dengan yang sedang dimuat, abaikan (cegah request kembar)
      if (pendingTargetRef.current === href) {
        console.log(`[NAV_DEBUG executeNavigation GUARD_2_DUPLICATE ${now}] Click duplicate for pending target "${href}". hasShownToast=${hasShownPendingToastRef.current}`);
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
      console.log(`[NAV_DEBUG SET_REFS ${now}] pendingTargetRef="${href}", isRecovering=false`);

      // LAPIS 2: Pasang Hard Fail-Safe Timer 4 detik (HANYA SEKALI per target baru, kebal klik berulang)
      clearHardFailSafe();
      console.log(`[NAV_DEBUG LAPIS_2_TIMER_SET ${now}] Target="${href}", delay=4000ms`);
      hardFailSafeTimerRef.current = setTimeout(() => {
        const fireTime = Date.now();
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname : pathname;
        const isArrived =
          currentPath === href ||
          currentPath === href.split("?")[0] ||
          pathname === href ||
          pathname === href.split("?")[0];

        console.log(`[NAV_DEBUG LAPIS_2_TIMER_FIRE ${fireTime}] target="${href}", currentPath="${currentPath}", pathname="${pathname}", isArrived=${isArrived}`);

        if (!isArrived) {
          console.log(`[NAV_DEBUG LAPIS_2_TRIGGERING_RECOVERY ${fireTime}] Not arrived after 4000ms! Calling triggerRecovery("${href}")`);
          triggerRecovery(href);
        } else {
          console.log(`[NAV_DEBUG LAPIS_2_ALREADY_ARRIVED ${fireTime}] Already arrived at "${href}". No recovery needed.`);
        }
      }, 4000);

      // 4. Jalankan transisi navigasi Next.js
      console.log(`[NAV_DEBUG executeNavigation START_TRANSITION ${now}] Calling router.push("${href}")`);
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
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const download = anchor.getAttribute("download");

      console.log(`[NAV_DEBUG handleClick DETECTED ${now}] href="${href}", anchorTag="${anchor.tagName}", targetAttr="${targetAttr}", download="${download}", e.button=${e.button}`);

      const isModifierKey = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
      const isNormalLeftClick = e.button === 0 && !isModifierKey;
      const isInternalLink =
        Boolean(href) &&
        href!.startsWith("/") &&
        !href!.startsWith("//") &&
        !href!.startsWith("/api") &&
        !href!.startsWith("#") &&
        !download &&
        (!targetAttr || targetAttr === "_self");

      if (!isInternalLink || !isNormalLeftClick) {
        console.log(`[NAV_DEBUG handleClick REJECT_NOT_INTERNAL ${now}] isInternalLink=${isInternalLink}, isNormalLeftClick=${isNormalLeftClick}`);
        return;
      }

      if (pathname === href || pathname === href!.split("?")[0]) {
        console.log(`[NAV_DEBUG handleClick REJECT_SAME_ROUTE ${now}] pathname="${pathname}" === href="${href}"`);
        e.preventDefault();
        return;
      }

      if (pendingTargetRef.current === href) {
        console.log(`[NAV_DEBUG handleClick REJECT_PENDING_DUPLICATE ${now}] href="${href}" === pendingTargetRef="${pendingTargetRef.current}"`);
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

      console.log(`[NAV_DEBUG handleClick PASS -> executeNavigation ${now}] href="${href}"`);
      e.preventDefault();
      executeNavigation(href!);
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
    const now = Date.now();
    const wasPending = prevIsPendingRef.current;
    prevIsPendingRef.current = isPending;

    const target = lastAttemptedHrefRef.current;
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : pathname;
    const isArrived =
      Boolean(target) &&
      (currentPath === target ||
        currentPath === target!.split("?")[0] ||
        pathname === target ||
        pathname === target!.split("?")[0]);

    console.log(`[NAV_DEBUG LAPIS_1_EFFECT ${now}] wasPending=${wasPending}, isPending=${isPending}, target="${target}", currentPath="${currentPath}", pathname="${pathname}", isArrived=${isArrived}`);

    if (wasPending && !isPending) {
      if (target) {
        if (!isArrived) {
          console.log(`[NAV_DEBUG LAPIS_1_ABORT_DETECTED ${now}] React transition dropped (wasPending=true -> isPending=false) while not arrived at "${target}"! Calling triggerRecovery`);
          triggerRecovery(target);
        } else {
          console.log(`[NAV_DEBUG LAPIS_1_SUCCESS ${now}] Transition finished and arrived at "${target}".`);
        }
      } else {
        console.log(`[NAV_DEBUG LAPIS_1_NO_TARGET ${now}] wasPending=true -> isPending=false but target is null.`);
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
