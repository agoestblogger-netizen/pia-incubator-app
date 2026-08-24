"use client";

import React, { createContext, useContext, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CenteredPageLoader } from "./CenteredPageLoader";

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

  const navigate = (href: string) => {
    if (pathname === href) return;
    startTransition(() => {
      router.push(href);
    });
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const download = anchor.getAttribute("download");

      // Only intercept internal same-origin relative links without special modifier keys
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
        if (pathname === href) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, router]);

  return (
    <NavigationContext.Provider value={{ navigate, isPending }}>
      {isPending && <CenteredPageLoader text="Sedang proses....." />}
      {children}
    </NavigationContext.Provider>
  );
}
