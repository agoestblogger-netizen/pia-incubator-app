"use client";

import Link from "next/link";
import { FileText, KanbanSquare } from "lucide-react";

interface InnovationSetupSubNavProps {
  timId: string;
  activeTab: "charter" | "kanban";
}

export function InnovationSetupSubNav({ timId, activeTab }: InnovationSetupSubNavProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl w-full sm:w-fit border border-gray-200 shadow-2xs">
      <Link
        href={`/tim/${timId}/charter`}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeTab === "charter"
            ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
            : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
        }`}
      >
        <FileText className={`h-4 w-4 shrink-0 ${activeTab === "charter" ? "text-[#5142D6]" : "text-gray-400"}`} />
        <span>1. Innovation Charter</span>
      </Link>

      <Link
        href={`/tim/${timId}/kanban`}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeTab === "kanban"
            ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
            : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
        }`}
      >
        <KanbanSquare className={`h-4 w-4 shrink-0 ${activeTab === "kanban" ? "text-[#5142D6]" : "text-gray-400"}`} />
        <span>2. Sprint Planning &amp; Kanban Board</span>
      </Link>
    </div>
  );
}
