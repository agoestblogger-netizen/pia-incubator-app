"use client";

import React, { useState, useRef } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Info, X, BookOpen } from "lucide-react";

interface SectionInfoProps {
  /** Judul atau kode template juklak, misal "Template 1 Juklak" atau "Template 2.1" */
  title?: string;
  /** Teks penjelasan resmi dari dokumen Template Juklak */
  text: string;
  /** Posisi popover: 'top' | 'right' | 'bottom' | 'left' */
  side?: "top" | "right" | "bottom" | "left";
  /** Custom class untuk trigger badge */
  className?: string;
}

/**
 * Badge ikon ⓘ interaktif untuk section header.
 * - Desktop: Muncul saat di-hover (dengan delay kecil) atau di-klik.
 * - Mobile: Muncul saat di-tap.
 * - Menggunakan Radix Portal sehingga tidak terpotong oleh overflow-hidden pada Card.
 * - Sumber teks diambil langsung dari dokumen resmi Petunjuk Pelaksanaan (Juklak) Inovasi.
 */
export function SectionInfo({
  title = "Panduan Juklak Resmi",
  text,
  side = "bottom",
  className = "",
}: SectionInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsOpen(true), 120);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsOpen(false), 180);
  };

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`inline-flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 focus:outline-none transition-colors cursor-help shrink-0 align-middle ${className}`}
          title="Klik atau arahkan kursor untuk membaca panduan resmi Juklak"
          aria-label={`Panduan Juklak: ${title}`}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align="start"
          sideOffset={6}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-80 sm:w-96 rounded-2xl bg-white/95 backdrop-blur-md p-3.5 shadow-2xl border border-emerald-200/90 text-left animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          style={{ filter: "drop-shadow(0 12px 24px rgba(15, 81, 50, 0.15))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-100/80">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-emerald-100/70 text-[#0F5132]">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-black tracking-wide text-emerald-950 uppercase">
                {title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Tutup tooltip"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <p className="text-[11px] text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
            {text}
          </p>

          {/* Footer note */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 font-medium">
            <span>📌 Acuan format baku Juklak PIA</span>
            <span className="italic">PT Pegadaian</span>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
