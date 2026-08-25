"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Sparkles,
  Zap,
  Lock,
  ArrowRight,
  ArrowUp,
  Info,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BacklogReferenceDropdownProps {
  currentPlanningSprintNumber: number;
  sprints: any[];
  aiReferenceCards: any[];
  canEdit: boolean;
  isCvUnlocked: boolean;
  isMvUnlocked: boolean;
  onSelectCard: (card: any, forceSprintNum?: number) => void;
}

export function BacklogReferenceDropdown({
  currentPlanningSprintNumber,
  sprints = [],
  aiReferenceCards = [],
  canEdit,
  isCvUnlocked,
  isMvUnlocked,
  onSelectCard,
}: BacklogReferenceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<any | null>(null);
  const [touchCard, setTouchCard] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(10);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredCard(null);
        setTouchCard(null);
        setSearchQuery("");
        setDisplayLimit(10);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opening dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (card: any, isPhaseLocked: boolean) => {
    if (isPhaseLocked || !canEdit) return;

    // Direct open modal in appropriate mode
    onSelectCard(card, currentPlanningSprintNumber);
    setIsOpen(false);
    setHoveredCard(null);
    setTouchCard(null);
    setSearchQuery("");
    setDisplayLimit(10);
  };

  const handleTouchItem = (card: any, isPhaseLocked: boolean) => {
    if (touchCard?.id === card.id && !isPhaseLocked) {
      handleSelect(card, isPhaseLocked);
      return;
    }
    setTouchCard(card);
  };

  // Helper to check phase lock
  const getPhaseLockInfo = (card: any) => {
    if (card.tahap === "customer_validation" && !isCvUnlocked) {
      return { isLocked: true, reason: "Fase Customer Validation belum terbuka" };
    }
    if (card.tahap === "market_validation" && !isMvUnlocked) {
      return { isLocked: true, reason: "Fase Market Validation belum terbuka" };
    }
    return { isLocked: false, reason: "" };
  };

  // 1. Order sprints so that the current planning sprint is AT THE VERY TOP, followed by other sprints in order
  const orderedSprints = useMemo(() => {
    const sorted = [...sprints].sort((a, b) => a.nomorSprint - b.nomorSprint);
    const active = sorted.find((s) => s.nomorSprint === currentPlanningSprintNumber);
    const passives = sorted.filter((s) => s.nomorSprint !== currentPlanningSprintNumber);
    return active ? [active, ...passives] : sorted;
  }, [sprints, currentPlanningSprintNumber]);

  // 2. Order all cards: active sprint cards first, then passive sprint cards
  const allOrderedCards = useMemo(() => {
    const activeCards: any[] = [];
    const passiveCards: any[] = [];

    for (const card of aiReferenceCards) {
      const sNum = card.suggestedSprintNumber || 1;
      if (sNum === currentPlanningSprintNumber) {
        activeCards.push(card);
      } else {
        passiveCards.push(card);
      }
    }

    // Sort passive cards by suggestedSprintNumber
    passiveCards.sort((a, b) => (a.suggestedSprintNumber || 1) - (b.suggestedSprintNumber || 1));

    return [...activeCards, ...passiveCards];
  }, [aiReferenceCards, currentPlanningSprintNumber]);

  // 3. Apply search query across all cards
  const searchedCards = useMemo(() => {
    if (!searchQuery.trim()) return allOrderedCards;
    const q = searchQuery.toLowerCase().trim();
    return allOrderedCards.filter((c) => {
      const matchTitle = (c.judul || "").toLowerCase().includes(q);
      const matchDesc = (c.deskripsi || "").toLowerCase().includes(q);
      const matchLabel = (c.label || "").toLowerCase().includes(q);
      return matchTitle || matchDesc || matchLabel;
    });
  }, [allOrderedCards, searchQuery]);

  // 4. Paginate / limit cards when search is not active
  const isSearchActive = searchQuery.trim().length > 0;
  const visibleCards = useMemo(() => {
    if (isSearchActive) return searchedCards;
    return searchedCards.slice(0, displayLimit);
  }, [searchedCards, isSearchActive, displayLimit]);

  const hasMoreCards = !isSearchActive && searchedCards.length > displayLimit;
  const remainingCount = searchedCards.length - displayLimit;

  // Active preview card for desktop side / mobile bottom preview
  const activePreviewCard = hoveredCard || touchCard;

  // Render when completely empty (all cards adopted)
  if (aiReferenceCards.length === 0) {
    return (
      <div className="w-full">
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-xs font-medium text-gray-400 cursor-not-allowed select-none"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate italic">
              Semua kartu Backlog Referensi telah diadopsi ke Backlog Kerja.
            </span>
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

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setHoveredCard(null);
          setTouchCard(null);
          setSearchQuery("");
        }}
        className={`w-full flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs text-left cursor-pointer ${
          isOpen
            ? "border-purple-500 ring-2 ring-purple-100 bg-white"
            : "bg-white hover:bg-purple-50/40 border-purple-200/90 text-gray-800"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          <Sparkles className="h-4 w-4 shrink-0 text-purple-600" />
          <span className="truncate text-gray-700 font-medium">
            -- Pilih kartu untuk ditinjau / dipromosikan --
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
            {aiReferenceCards.length} kartu tersedia
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-purple-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Floating Menu with Search, Sections, and Hover Preview */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col md:flex-row">
          {/* Left Column: Search Bar + Grouped Sections List */}
          <div className="w-full md:w-3/5 max-h-[380px] overflow-y-auto flex flex-col divide-y divide-gray-100">
            {/* Search Input Bar */}
            <div className="p-2.5 bg-gray-50/90 sticky top-0 z-10 border-b border-gray-200 flex items-center gap-2 px-3">
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul kartu referensi (lintas semua sprint)..."
                className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List Grouped by Sprint Section */}
            <div className="divide-y divide-gray-100">
              {searchedCards.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 space-y-1">
                  <p className="font-semibold text-gray-600">Tidak ada kartu yang cocok</p>
                  <p className="text-[11px]">Coba cari dengan kata kunci lain.</p>
                </div>
              ) : (
                orderedSprints.map((s) => {
                  const isCurrentPlanningSprint = s.nomorSprint === currentPlanningSprintNumber;
                  // Filter cards that belong to this sprint and are currently visible
                  const cardsInThisSection = visibleCards.filter(
                    (c) => (c.suggestedSprintNumber || 1) === s.nomorSprint
                  );

                  if (cardsInThisSection.length === 0) return null;

                  return (
                    <div key={s.nomorSprint} className="space-y-0">
                      {/* Section Header */}
                      <div
                        className={`px-3.5 py-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider sticky top-[41px] z-5 ${
                          isCurrentPlanningSprint
                            ? "bg-purple-100/90 text-purple-900 border-y border-purple-200"
                            : "bg-gray-100/90 text-gray-600 border-y border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>
                            SPRINT {s.nomorSprint} ·{" "}
                            {isCurrentPlanningSprint ? "SEDANG DIRENCANAKAN" : "BELUM WAKTUNYA"}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              isCurrentPlanningSprint
                                ? "bg-purple-200 text-purple-950"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {cardsInThisSection.length}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold lowercase hidden sm:inline opacity-80">
                          {isCurrentPlanningSprint ? "tinjau & adopsi" : "promosikan"}
                        </span>
                      </div>

                      {/* Card Items inside Section */}
                      <div className="divide-y divide-gray-50">
                        {cardsInThisSection.map((card) => {
                          const { isLocked } = getPhaseLockInfo(card);
                          const isHovered = hoveredCard?.id === card.id;
                          const isTouched = touchCard?.id === card.id;
                          const isSelected = isHovered || isTouched;

                          return (
                            <div
                              key={card.id}
                              onMouseEnter={() => setHoveredCard(card)}
                              onMouseLeave={() => setHoveredCard(null)}
                              onClick={() => {
                                handleTouchItem(card, isLocked);
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
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                      isCurrentPlanningSprint ? "bg-purple-600" : "bg-gray-400"
                                    }`}
                                  />
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
                                  <span className="text-[10px] text-purple-600 sm:inline hidden">
                                    {isCurrentPlanningSprint ? "Tinjau →" : "Promosikan ↑"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Load More Button if cards exceed displayLimit */}
              {hasMoreCards && (
                <div className="p-2.5 bg-gray-50 text-center border-t border-gray-200">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDisplayLimit((prev) => prev + 10);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                  >
                    <span>Lihat {remainingCount} kartu lainnya</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Rich Live Preview Panel (Desktop Side, Mobile Bottom) */}
          <div className="w-full md:w-2/5 p-4.5 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between min-h-[220px] text-xs">
            {activePreviewCard ? (
              (() => {
                const { isLocked, reason } = getPhaseLockInfo(activePreviewCard);
                const isCardInActiveSprint =
                  (activePreviewCard.suggestedSprintNumber || 1) === currentPlanningSprintNumber;

                return (
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-2xs ${
                            activePreviewCard.label?.includes("CV") ||
                            activePreviewCard.tahap === "customer_validation"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : activePreviewCard.label?.includes("MV") ||
                                activePreviewCard.tahap === "market_validation"
                              ? "bg-indigo-100 text-indigo-900 border-indigo-300"
                              : "bg-purple-100 text-purple-900 border-purple-300"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {activePreviewCard.label || "Draf Roadmap"}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-bold border border-gray-200 text-[10px]">
                            Sprint {activePreviewCard.suggestedSprintNumber || 1}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 border border-purple-300 text-[10px] font-black shadow-2xs">
                            <Zap className="h-2.5 w-2.5 text-purple-700 fill-purple-700" />
                            {activePreviewCard.storyPoint || 3} SP
                          </span>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-gray-900 text-sm leading-snug line-clamp-2">
                        {activePreviewCard.judul}
                      </h4>

                      <p className="text-xs text-gray-700 font-medium line-clamp-3 leading-relaxed">
                        {activePreviewCard.deskripsi ||
                          "Tidak ada deskripsi detail untuk kartu usulan ini."}
                      </p>

                      {isLocked && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-start gap-2 shadow-2xs">
                          <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                          <span>🔒 {reason}. Selesaikan fase sebelumnya untuk mengadopsi kartu ini.</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      {isLocked ? (
                        <Button
                          type="button"
                          disabled
                          size="sm"
                          className="w-full bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed text-xs font-semibold"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                          Fase Terkunci
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canEdit}
                          onClick={() => handleSelect(activePreviewCard, isLocked)}
                          className={`w-full text-xs font-bold gap-1.5 shadow-xs cursor-pointer ${
                            isCardInActiveSprint
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "bg-[#0F5132] hover:bg-[#1B7A4D] text-white"
                          }`}
                        >
                          {isCardInActiveSprint ? (
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
                <p className="text-[11px] font-medium text-gray-500">
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
