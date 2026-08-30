"use client";

import { usePathname } from "next/navigation";

export function AppShellMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Ruang Diskusi pages: /tim/[id]/diskusi (daftar kanvas) and /tim/[id]/diskusi/[canvasId] (kanvas kerja)
  // should span full-width aligning with the header navbar's horizontal padding (px-4 sm:px-6 lg:px-8)
  const isDiskusi = Boolean(
    pathname && /\/tim\/[^/]+\/diskusi(\/.*)?$/.test(pathname)
  );

  if (isDiskusi) {
    return (
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {children}
    </main>
  );
}
