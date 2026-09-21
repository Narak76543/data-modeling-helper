"use client";

import React from "react";
import { Download } from "lucide-react";

interface HeaderProps {
  onOpenExport?: () => void;
}

export function Header({ onOpenExport }: HeaderProps) {
  return (
    <header className="h-11 border-b border-ink/20 bg-surface px-4 flex items-center justify-between select-none">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold tracking-tight text-ink font-sans">
          Data Modeling Helper
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 bg-accent hover:bg-accent/90 text-surface text-xs font-medium py-1 px-3 rounded-[2px] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Documentation</span>
        </button>
      </div>
    </header>
  );
}
