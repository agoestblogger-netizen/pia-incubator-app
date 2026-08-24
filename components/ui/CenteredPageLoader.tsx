import React from 'react';
import { Loader2 } from 'lucide-react';

export function CenteredPageLoader({
  text = "Sedang proses.....",
}: {
  text?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-transparent animate-in fade-in duration-150">
      <div className="bg-white px-7 py-6 rounded-2xl shadow-2xl border border-gray-200/90 flex flex-col items-center justify-center gap-3.5 min-w-[200px] pointer-events-auto animate-in zoom-in-95 duration-150">
        <Loader2 className="h-8 w-8 text-[#0F5132] animate-spin" />
        <span className="text-xs font-semibold text-gray-700 tracking-wide">
          {text}
        </span>
      </div>
    </div>
  );
}
