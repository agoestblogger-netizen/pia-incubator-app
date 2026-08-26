"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Check, X, PenTool, Loader2 } from "lucide-react";

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void> | void;
  title?: string;
  roleName?: string;
  userName?: string;
}

export function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = "Bubuhkan Tanda Tangan Digital",
  roleName,
  userName,
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize and clear canvas when modal opens
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a"; // Deep slate / ink color

    // Clear background to transparent
    ctx.clearRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly to ensure dialog DOM is rendered and has layout
      const timer = setTimeout(() => {
        initCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initCanvas]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    setIsEmpty(false);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
    lastPointRef.current = null;
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    setSaving(true);
    try {
      // Export as transparent PNG base64
      const dataUrl = canvas.toDataURL("image/png");
      await onSave(dataUrl);
      onClose();
    } catch (err) {
      console.error("[SignaturePad] Error saving signature:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white shadow-2xl border border-gray-100">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <PenTool className="h-4.5 w-4.5 text-[#0F5132]" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            {userName && roleName ? (
              <span>
                Menandatangani sebagai <strong>{userName}</strong> ({roleName}).
              </span>
            ) : (
              "Gunakan mouse, stylus, atau jari pada layar sentuh untuk menggambar tanda tangan Anda."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {/* Canvas Wrapper */}
          <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-slate-50/70 overflow-hidden shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              className="w-full h-44 cursor-crosshair block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
            />

            {/* Subtle Signature Baseline */}
            <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300/80 pointer-events-none flex justify-between items-end pb-0.5">
              <span className="text-[10px] text-gray-400 select-none font-mono">Tanda Tangan Digital</span>
              <span className="text-[10px] text-gray-400 select-none font-mono">X</span>
            </div>

            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs italic select-none">
                Goreskan tanda tangan Anda di area ini...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span>Tanda tangan ini akan disimpan dan disematkan pada dokumen resmi.</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isEmpty || saving}
              className="h-7 text-xs font-semibold text-gray-500 hover:text-red-600 gap-1 px-2 cursor-pointer"
            >
              <Eraser className="h-3 w-3" />
              <span>Bersihkan</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-end gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl text-xs font-semibold"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            <span>Batal</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isEmpty || saving}
            className="bg-[#0F5132] hover:bg-[#1B7A4D] text-white rounded-xl text-xs font-bold px-4 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                <span>Simpan Tanda Tangan</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
