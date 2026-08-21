"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Kanban,
  UserCheck,
  TrendingUp,
  Wallet,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TimNavTabs({ timId }: { timId: string }) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Ringkasan",
      href: `/tim/${timId}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Innovation Charter",
      href: `/tim/${timId}/charter`,
      icon: FileText,
    },
    {
      name: "Kanban & Roadmap",
      href: `/tim/${timId}/kanban`,
      icon: Kanban,
    },
    {
      name: "Customer Validation",
      href: `/tim/${timId}/customer-validation`,
      icon: UserCheck,
    },
    {
      name: "Market Validation",
      href: `/tim/${timId}/market-validation`,
      icon: TrendingUp,
    },
    {
      name: "RAB & LPJ",
      href: `/tim/${timId}/keuangan`,
      icon: Wallet,
    },
    {
      name: "FMI & Hasil",
      href: `/tim/${timId}/governance`,
      icon: Award,
    },
  ];

  return (
    <div className="border-b border-gray-200 bg-white rounded-xl shadow-xs p-1">
      <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap px-3.5 py-2 text-xs font-semibold rounded-lg transition-all",
                isActive
                  ? "bg-[#0F5132] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-[#E6CA65]" : "text-gray-400")} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
