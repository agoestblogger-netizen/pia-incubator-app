"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
  minHeight?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      autoResize = true,
      minHeight = 80,
      value,
      defaultValue,
      onChange,
      onInput,
      style,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Merge forwarded ref and internal ref
    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    const adjustHeight = React.useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;

      // Reset height to auto first to properly calculate scrollHeight on shrink or grow
      textarea.style.height = "auto";
      const targetHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${targetHeight}px`;
    }, [autoResize, minHeight]);

    // Recalculate on value or defaultValue changes
    React.useEffect(() => {
      adjustHeight();
    }, [value, defaultValue, adjustHeight]);

    // Adjust on initial mount and window resize
    React.useEffect(() => {
      adjustHeight();
      const handleWindowResize = () => adjustHeight();
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }, [adjustHeight]);

    // Adjust whenever the element becomes visible (e.g. parent accordion / collapsible expanded)
    React.useEffect(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;

      // Check using ResizeObserver
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
          if (textarea.offsetParent !== null) {
            adjustHeight();
          }
        });
        observer.observe(textarea);
        return () => observer.disconnect();
      }

      // Fallback microtask
      const timer = setTimeout(adjustHeight, 50);
      return () => clearTimeout(timer);
    }, [adjustHeight, autoResize]);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onInput?.(e as React.FormEvent<HTMLTextAreaElement> & React.InputEvent<HTMLTextAreaElement>);
    };

    return (
      <textarea
        className={cn(
          "flex w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-xs sm:text-sm text-gray-900 leading-relaxed placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:border-[#0F5132] disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-2xs resize-none overflow-hidden",
          className
        )}
        ref={internalRef}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onInput={handleInput}
        style={{
          minHeight: `${minHeight}px`,
          overflow: "hidden",
          ...style,
        }}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
