'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Info, X } from 'lucide-react';

interface RoleProposalHintTooltipProps {
  title: string;
  content: string;
  badgeLabel?: string;
  color?: 'amber' | 'emerald' | 'blue';
}

export function RoleProposalHintTooltip({
  title,
  content,
  badgeLabel = 'Ada usulan',
  color = 'amber',
}: RoleProposalHintTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const colorStyles = {
    amber: {
      badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
      icon: 'text-amber-600',
      header: 'text-amber-900 border-amber-100 bg-amber-50/50',
      border: 'border-amber-200',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
      icon: 'text-emerald-600',
      header: 'text-emerald-900 border-emerald-100 bg-emerald-50/50',
      border: 'border-emerald-200',
    },
    blue: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
      icon: 'text-blue-600',
      header: 'text-blue-900 border-blue-100 bg-blue-50/50',
      border: 'border-blue-200',
    },
  }[color];

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Small Badge / Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer shadow-2xs ${colorStyles.badge}`}
        title="Klik atau arahkan kursor untuk melihat usulan dari proposal"
      >
        <Lightbulb className={`w-2.5 h-2.5 shrink-0 ${colorStyles.icon}`} />
        <span>{badgeLabel}</span>
      </button>

      {/* Floating Tooltip Content */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 rounded-xl bg-white border shadow-xl p-3 text-left transition-all animate-in fade-in zoom-in-95 duration-150 ${colorStyles.border}`}
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-1.5 mb-1.5 border-b ${colorStyles.header} -mx-3 -mt-3 px-3 pt-2.5 rounded-t-xl`}>
            <div className="flex items-center gap-1.5">
              <Lightbulb className={`w-3.5 h-3.5 shrink-0 ${colorStyles.icon}`} />
              <span className="font-bold text-[11px] text-gray-900">{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded-sm"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Text Content */}
          <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap font-normal">
            {content}
          </p>

          <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400">
            <span>💡 Rekomendasi dari submisi proposal</span>
            <span className="italic">Pilih akun secara manual</span>
          </div>
        </div>
      )}
    </div>
  );
}
