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
      minHeight,
      value,
      defaultValue,
      onChange,
      onInput,
      style,
      rows,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Merge forwarded ref and internal ref
    React.useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

    // Compute default minHeight: if rows is given, e.g. rows=2 -> ~60px, else default 68px
    const defaultMinHeight = rows ? Math.max(rows * 22 + 20, 52) : 68;
    const effectiveMinHeight = minHeight ?? defaultMinHeight;

    const adjustHeight = React.useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;

      // Reset height to auto first to properly calculate scrollHeight on shrink or grow
      textarea.style.height = "auto";
      // Add +6px buffer for border-box top/bottom borders (2px) and subpixel line-height anti-aliasing (4px)
      const targetHeight = Math.max(textarea.scrollHeight + 6, effectiveMinHeight);
      textarea.style.height = `${targetHeight}px`;
    }, [autoResize, effectiveMinHeight]);

    // Recalculate on value or defaultValue changes
    React.useEffect(() => {
      adjustHeight();
      // Handle modal/dialog opening transition delays (e.g. Radix zoom-in animation)
      const raf = requestAnimationFrame(adjustHeight);
      const t1 = setTimeout(adjustHeight, 100);
      const t2 = setTimeout(adjustHeight, 250);
      const t3 = setTimeout(adjustHeight, 450);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }, [value, defaultValue, adjustHeight]);

    // Adjust on initial mount and window resize
    React.useEffect(() => {
      adjustHeight();
      const handleWindowResize = () => adjustHeight();
      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }, [adjustHeight]);

    // Adjust whenever the element's width changes (e.g. parent dialog expands / responsive columns adjust)
    React.useEffect(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;

      if (typeof ResizeObserver !== "undefined") {
        let prevWidth = textarea.clientWidth;
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const newWidth = entry.contentRect.width;
            if (Math.abs(newWidth - prevWidth) > 1) {
              prevWidth = newWidth;
              adjustHeight();
            }
          }
        });
        observer.observe(textarea);
        return () => observer.disconnect();
      }

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
          "flex w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 leading-relaxed placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:border-[#0F5132] disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-2xs resize-none overflow-y-auto break-words",
          className
        )}
        ref={internalRef}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onInput={handleInput}
        rows={rows}
        style={{
          minHeight: `${effectiveMinHeight}px`,
          ...style,
        }}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
