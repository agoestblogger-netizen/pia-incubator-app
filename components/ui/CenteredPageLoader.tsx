import React from 'react';
import { Loader2 } from 'lucide-react';

export function CenteredPageLoader() {
  return (
    <div className="w-full flex items-center justify-center min-h-[55vh] py-16 animate-in fade-in duration-150">
      <Loader2 className="h-9 w-9 sm:h-10 sm:w-10 text-[#0F5132] animate-spin" />
    </div>
  );
}
