import React from 'react';
import { Skeleton } from './skeleton';
import { Sparkles, Loader2 } from 'lucide-react';

interface PageLoadingSkeletonProps {
  variant?: 'dashboard' | 'dossier_list' | 'dossier_detail' | 'charter' | 'kanban' | 'keuangan' | 'table' | 'default';
  title?: string;
  subtitle?: string;
}

export function PageLoadingSkeleton({
  variant = 'default',
  title,
  subtitle,
}: PageLoadingSkeletonProps) {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Floating Mini-Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="space-y-1.5">
          {title ? (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F5132] bg-[#0F5132]/5 px-2 py-0.5 rounded-full border border-[#0F5132]/20">
                <Loader2 className="w-3 h-3 animate-spin" />
                Memuat Data...
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-56 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          )}
          {subtitle ? (
            <p className="text-xs text-gray-500">{subtitle}</p>
          ) : (
            <Skeleton className="h-4 w-80 rounded-md" />
          )}
        </div>

        {/* Brand Accent */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F5132]/5 border border-[#0F5132]/10 text-xs font-semibold text-[#0F5132]">
          <Sparkles className="w-3.5 h-3.5 text-[#E6CA65]" />
          <span>PIA Incubator S12</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. DASHBOARD VARIANT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {variant === 'dashboard' && (
        <div className="space-y-6">
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            ))}
          </div>

          {/* Large Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-44 rounded-md" />
                        <Skeleton className="h-3 w-28 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. DOSSIER LIST VARIANT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {variant === 'dossier_list' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>

          {/* Dossier Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-4/5 rounded-md" />
                  <Skeleton className="h-4 w-3/5 rounded-md" />
                </div>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. DOSSIER DETAIL VARIANT (Split View with PDF Placeholder) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {variant === 'dossier_detail' && (
        <div className="space-y-5">
          {/* Header Action Bar */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
          </div>

          {/* Split 2-Column (Left: Form Fields, Right: PDF Viewer) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Metadata & Section summary */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
                <Skeleton className="h-5 w-36 rounded-md" />
                <div className="space-y-3 pt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-28 rounded-md" />
                      <Skeleton className="h-4 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
                <Skeleton className="h-5 w-44 rounded-md" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>

            {/* Right: PDF Viewer Frame */}
            <div className="lg:col-span-7 p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs flex flex-col items-center justify-center min-h-[600px] text-center space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#0F5132]/10 border border-[#0F5132]/20">
                <Loader2 className="w-8 h-8 text-[#0F5132] animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800">Menyiapkan Dokumen Dossier & PDF</h3>
                <p className="text-xs text-gray-400 max-w-xs">
                  Sedang memuat data terarsip dan merender viewer dokumen...
                </p>
              </div>
              <Skeleton className="h-4 w-48 rounded-md mt-2" />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. CHARTER VARIANT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {variant === 'charter' && (
        <div className="space-y-6">
          {/* Step Progress Header */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          {/* Form Card */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            {/* Table skeleton */}
            <div className="pt-4 space-y-2">
              <Skeleton className="h-5 w-36 rounded-md" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. KANBAN VARIANT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {variant === 'kanban' && (
        <div className="space-y-5">
          {/* Sprint Toolbar */}
          <div className="p-3.5 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-32 rounded-xl" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </div>

          {/* 4 Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Backlog', 'To Do', 'In Progress', 'Done'].map((col, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 shadow-2xs space-y-3 min-h-[480px]">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-700">{col}</span>
                    <Skeleton className="h-4 w-6 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded-md" />
                </div>
                {[1, 2, 3].slice(0, 4 - idx).map((card) => (
                  <div key={card} className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-full rounded-md" />
                    <div className="pt-2 flex justify-between items-center">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. KEUANGAN VARIANT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {variant === 'keuangan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-7 w-36 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            ))}
          </div>
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. TABLE / LIST VARIANT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(variant === 'table' || variant === 'default') && (
        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-10 w-full rounded-xl bg-gray-100" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
