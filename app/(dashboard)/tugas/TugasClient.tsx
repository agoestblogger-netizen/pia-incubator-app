"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileCheck2,
  Wallet,
  Gavel,
  Clock,
  CheckSquare,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateIndo } from "@/lib/utils";
import { dismissTaskAction, type MyTasksSummary, type TaskCategory, type TaskItem } from "@/app/actions/tasks";

export function TugasClient({ initialSummary }: { initialSummary: MyTasksSummary }) {
  const [summary, setSummary] = useState<MyTasksSummary>(initialSummary);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const categories = [
    {
      id: "all",
      label: "Semua Tugas",
      count: summary.totalCount,
      icon: Layers,
    },
    {
      id: "persetujuan",
      label: "Persetujuan Dokumen",
      count: summary.tasksByCategory.persetujuan.length,
      icon: FileCheck2,
    },
    {
      id: "otorisasi_anggaran",
      label: "Otorisasi Anggaran & LPJ",
      count: summary.tasksByCategory.otorisasi_anggaran.length,
      icon: Wallet,
    },
    {
      id: "keputusan_fmi",
      label: "Keputusan FMI",
      count: summary.tasksByCategory.keputusan_fmi.length,
      icon: Gavel,
    },
    {
      id: "durasi_tim",
      label: "Durasi Tim Inkubasi",
      count: summary.tasksByCategory.durasi_tim.length,
      icon: Clock,
    },
    {
      id: "kanban",
      label: "Kartu Board Sprint Saya",
      count: summary.tasksByCategory.kanban.length,
      icon: CheckSquare,
    },
  ].filter((c) => c.id === "all" || c.count > 0);

  const filteredTasks: TaskItem[] =
    selectedCategory === "all"
      ? summary.allTasks
      : summary.tasksByCategory[selectedCategory as TaskCategory] || [];

  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case "persetujuan":
        return <FileCheck2 className="h-5 w-5 text-amber-600" />;
      case "otorisasi_anggaran":
        return <Wallet className="h-5 w-5 text-emerald-600" />;
      case "keputusan_fmi":
        return <Gavel className="h-5 w-5 text-purple-600" />;
      case "durasi_tim":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "kanban":
        return <CheckSquare className="h-5 w-5 text-indigo-600" />;
      default:
        return <Layers className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleDismiss = async (task: TaskItem) => {
    setDismissingId(task.id);

    // Optimistic UI update
    setSummary((prev) => {
      const newAllTasks = prev.allTasks.filter((t) => t.id !== task.id);
      const newCategoryTasks = (prev.tasksByCategory[task.category] || []).filter(
        (t) => t.id !== task.id
      );

      return {
        ...prev,
        totalCount: Math.max(0, prev.totalCount - 1),
        tasksByCategory: {
          ...prev.tasksByCategory,
          [task.category]: newCategoryTasks,
        },
        allTasks: newAllTasks,
      };
    });

    const res = await dismissTaskAction(task.taskType, task.entityId);
    if (!res.success) {
      alert(res.error || "Gagal menyembunyikan tugas.");
      // If error, reload page
      window.location.reload();
    }
    setDismissingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F5132] to-[#1B7A4D] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-[#E6CA65]" />
            Notifikasi Task Pending
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Tugas & Tindak Lanjut Saya
          </h1>
          <p className="text-sm text-green-100/90 leading-relaxed">
            Daftar tugas yang memerlukan persetujuan, otorisasi, penginputan keputusan, atau penyelesaian kartu Board Sprint Anda.
          </p>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center backdrop-blur-xs min-w-[140px]">
          <span className="text-3xl sm:text-4xl font-extrabold block text-white">
            {summary.totalCount}
          </span>
          <span className="text-xs font-medium text-green-100 uppercase tracking-wider block mt-0.5">
            Total Task Pending
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {categories.map((c) => {
          const Icon = c.icon;
          const isSelected = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-[#0F5132] text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{c.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : c.count > 0
                    ? "bg-amber-100 text-amber-900"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List Content */}
      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center bg-white/60">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            Semua Tugas Selesai!
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Tidak ada task pending yang memerlukan tindakan Anda pada kategori ini.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="text-xs font-semibold">
              Kembali ke Dashboard
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isDismissing = dismissingId === task.id;

            return (
              <Card
                key={task.id}
                className="hover:shadow-md transition-all border-gray-200 bg-white overflow-hidden relative group"
              >
                {/* Tombol Sembunyikan Task (Pojok Kanan Atas) */}
                <button
                  type="button"
                  onClick={() => handleDismiss(task)}
                  disabled={isDismissing}
                  title="Sembunyikan dari daftar tugas saya"
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10 flex items-center gap-1 text-[11px] font-medium opacity-80 group-hover:opacity-100"
                >
                  {isDismissing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[10px] text-gray-400 hover:text-gray-600">Sembunyikan</span>
                    </>
                  )}
                </button>

                <div className="p-4 sm:p-5 pr-14 sm:pr-24 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getCategoryIcon(task.category)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                          {task.categoryLabel}
                        </span>

                        {task.statusBadge && (
                          <Badge
                            variant={task.statusBadge.variant}
                            className="text-[10px]"
                          >
                            {task.statusBadge.label}
                          </Badge>
                        )}

                        {task.teamName && (
                          <span className="text-[11px] font-semibold text-[#0F5132]">
                            • Tim {task.teamName}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-gray-900 pr-6 sm:pr-0">
                        {task.title}
                      </h4>

                      <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                        {task.description}
                      </p>

                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 pt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Batas Waktu: {formatDateIndo(task.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Link href={task.link}>
                      <Button
                        size="sm"
                        className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white text-xs font-semibold gap-1.5 w-full sm:w-auto"
                      >
                        <span>Tindak Lanjuti</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
