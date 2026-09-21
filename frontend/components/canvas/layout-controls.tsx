"use client";

import React from "react";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import type { LayoutDirection } from "@/lib/layout";

interface LayoutControlsProps {
  onAutoLayout: (direction: LayoutDirection) => void;
}

export function LayoutControls({ onAutoLayout }: LayoutControlsProps) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center bg-surface/95 backdrop-blur-sm border border-ink/20 shadow-sm rounded-[2px] p-1 space-x-1 select-none">
      <div className="flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-ink-muted uppercase tracking-wider border-r border-ink/10 mr-0.5">
        <Sparkles className="w-3 h-3 text-accent mr-1" />
        <span>Layout</span>
      </div>

      <button
        type="button"
        onClick={() => onAutoLayout("TB")}
        className="flex items-center space-x-1 px-2 py-1 text-xs font-sans font-medium text-ink hover:text-accent hover:bg-bg rounded-[2px] transition-colors"
        title="Auto-organize tables vertically (Top-to-Bottom hierarchy)"
      >
        <ArrowDown className="w-3.5 h-3.5" />
        <span>Vertical</span>
      </button>

      <button
        type="button"
        onClick={() => onAutoLayout("LR")}
        className="flex items-center space-x-1 px-2 py-1 text-xs font-sans font-medium text-ink hover:text-accent hover:bg-bg rounded-[2px] transition-colors"
        title="Auto-organize tables horizontally (Left-to-Right flow)"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>Horizontal</span>
      </button>
    </div>
  );
}
