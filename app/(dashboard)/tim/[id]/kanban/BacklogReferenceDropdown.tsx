"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  ArrowUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BacklogReferenceDropdownProps {
  sprintNumber: number;
  isCurrentPlanningSprint: boolean;
  currentPlanningSprintNumber: number;
  cards: any[];
  hadAdoptedCards?: boolean;
  canEdit: boolean;
  isCvUnlocked: boolean;
  isMvUnlocked: boolean;
  onSelectCard: (card: any, forceSprintNum?: number) => void;
}

export function BacklogReferenceDropdown({
  sprintNumber,
  isCurrentPlanningSprint,
  currentPlanningSprintNumber,
  cards = [],
  hadAdoptedCards = false,
  canEdit,
  isCvUnlocked,
  isMvUnlocked,
  onSelectCard,
}: BacklogReferenceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<any | null>(null);
  const [touchCard, setTouchCard] = useState<any | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredCard(null);
        setTouchCard(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (card: any, isPhaseLocked: boolean) => {
    if (isPhaseLocked || !canEdit) return;

    // Direct open modal
    onSelectCard(card, currentPlanningSprintNumber);
    setIsOpen(false);
    setHoveredCard(null);
    setTouchCard(null);
  };

  const handleTouchItem = (card: any, isPhaseLocked: boolean, e: React.MouseEvent) => {
    if (touchCard?.id === card.id && !isPhaseLocked) {
      handleSelect(card, isPhaseLocked);
      return;
    }
    setTouchCard(card);
  };

  const activePreviewCard = hoveredCard || touchCard;

  // Check phase lock helper
  const getPhaseLockInfo = (card: any) => {
    if (card.tahap === "customer_validation" && !isCvUnlocked) {
      return { isLocked: true, reason: "Fase Customer Validation belum terbuka" };
    }
    if (card.tahap === "market_validation" && !isMvUnlocked) {
      return { isLocked: true, reason: "Fase Market Validation belum terbuka" };
    }
    return { isLocked: false, reason: "" };
  };

  // If group is empty, render disabled dropdown button with precise state message
  if (cards.length === 0) {
    const emptyPlaceholder = hadAdoptedCards
      ? `-- Semua kartu referensi Sprint ${sprintNumber} telah diadopsi --`
      : `-- Tidak ada kartu referensi untuk Sprint ${sprintNumber} --`;

    return (
      <div className="w-full">
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-xs font-medium text-gray-400 cursor-not-allowed select-none opacity-80"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span className="truncate italic">{emptyPlaceholder}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400 border border-gray-200">
              0 kartu
            </span>
            <ChevronDown className="h-4 w-4 text-gray-300" />
          </div>
        </button>
      </div>
    );
  }

  const placeholderText = isCurrentPlanningSprint
    ? "-- Pilih kartu untuk ditinjau & diadopsi --"
    : `-- Pilih kartu untuk dipromosikan ke Sprint ${currentPlanningSprintNumber} --`;

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setHoveredCard(null);
          setTouchCard(null);
        }}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs text-left cursor-pointer ${
          isOpen
            ? "border-purple-400 ring-2 ring-purple-100 bg-white"
            : isCurrentPlanningSprint
            ? "bg-white hover:bg-purple-50/40 border-purple-200/90 text-gray-800"
            : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <Sparkles
            className={`h-3.5 w-3.5 shrink-0 ${
              isCurrentPlanningSprint ? "text-purple-600" : "text-gray-400"
            }`}
          />
          <span className="truncate text-gray-700">{placeholderText}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              isCurrentPlanningSprint
                ? "bg-purple-100 text-purple-800 border border-purple-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            {cards.length} kartu
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-purple-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu & Preview Area */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col md:flex-row">
          {/* Options List */}
          <div className="w-full md:w-3/5 max-h-[340px] overflow-y-auto divide-y divide-gray-100">
            <div className="p-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-bold px-3">
              <span>DAFTAR USULAN KARTU ({cards.length})</span>
              <span className="hidden sm:inline text-gray-400">
                Arahkan kursor untuk preview
              </span>
            </div>

            {cards.map((card) => {
              const { isLocked, reason } = getPhaseLockInfo(card);
              const isHovered = hoveredCard?.id === card.id;
              const isTouched = touchCard?.id === card.id;
              const isSelected = isHovered || isTouched;

              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={(e) => {
                    handleTouchItem(card, isLocked, e);
                    if (!isLocked) {
                      handleSelect(card, isLocked);
                    }
                  }}
                  className={`px-3 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
                    isLocked
                      ? "bg-amber-50/40 text-gray-400 cursor-not-allowed opacity-75"
                      : isSelected
                      ? "bg-purple-50 text-purple-950 font-semibold"
                      : "hover:bg-purple-50/50 text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isLocked ? (
                      <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                    )}

                    <span
                      className={`truncate ${
                        isLocked ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {isLocked ? `🔒 ${card.judul} — fase terkunci` : card.judul}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-extrabold border border-purple-200">
                      <Zap className="h-2.5 w-2.5 text-purple-700 fill-purple-700" />
                      {card.storyPoint || 3} SP
                    </span>

                    {isLocked ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        Terkunci
                      </span>
                    ) : (
                      <span className="text-[10px] text-purple-600 opacity-0 group-hover:opacity-100 sm:inline hidden">
                        {isCurrentPlanningSprint ? "Tinjau →" : "Promosikan ↑"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Preview Panel (Desktop Side, Mobile Bottom) */}
          <div className="w-full md:w-2/5 p-3.5 bg-gray-50/90 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between min-h-[160px] text-xs">
            {activePreviewCard ? (
              (() => {
                const { isLocked, reason } = getPhaseLockInfo(activePreviewCard);
                return (
                  <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                            activePreviewCard.label?.includes("CV") ||
                            activePreviewCard.tahap === "customer_validation"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : activePreviewCard.label?.includes("MV") ||
                                activePreviewCard.tahap === "market_validation"
                              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                              : "bg-purple-100 text-purple-800 border-purple-200"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {activePreviewCard.label || "Draf Roadmap"}
                        </span>

                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-extrabold">
                          <Zap className="h-2.5 w-2.5 text-purple-700 fill-purple-700" />
                          {activePreviewCard.storyPoint || 3} SP
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 leading-snug line-clamp-2">
                        {activePreviewCard.judul}
                      </h4>

                      <p className="text-[11px] text-gray-600 line-clamp-3 leading-relaxed">
                        {activePreviewCard.deskripsi ||
                          "Tidak ada deskripsi detail untuk kartu usulan ini."}
                      </p>

                      {isLocked && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium flex items-start gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>🔒 {reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-200/80">
                      {isLocked ? (
                        <Button
                          type="button"
                          disabled
                          size="sm"
                          className="w-full bg-gray-200 text-gray-500 cursor-not-allowed text-xs font-semibold"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          Fase Terkunci
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canEdit}
                          onClick={() => handleSelect(activePreviewCard, isLocked)}
                          className={`w-full text-xs font-bold gap-1.5 shadow-xs cursor-pointer ${
                            isCurrentPlanningSprint
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
                          }`}
                        >
                          {isCurrentPlanningSprint ? (
                            <>
                              <ArrowRight className="h-3.5 w-3.5" />
                              <span>Tinjau &amp; Adopsi</span>
                            </>
                          ) : (
                            <>
                              <ArrowUp className="h-3.5 w-3.5" />
                              <span>Promosikan ke Sprint {currentPlanningSprintNumber}</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-1.5">
                <Info className="h-5 w-5 text-gray-300" />
                <p className="text-[11px] font-medium">
                  Arahkan kursor atau sentuh salah satu kartu untuk melihat preview ringkas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
