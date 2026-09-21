"use client";

import React from "react";
import { Download, Settings } from "lucide-react";

interface HeaderProps {
  onOpenExport?: () => void;
  onOpenSettings?: () => void;
}

export function Header({ onOpenExport, onOpenSettings }: HeaderProps) {
  return (
    <header className="h-11 border-b border-ink/20 bg-surface px-4 flex items-center justify-between select-none">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold tracking-tight text-ink font-sans">
          Data Modeling Helper
        </span>
      </div>
      <div className="flex items-center space-x-2.5">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center space-x-1.5 border border-ink/20 hover:bg-ink/5 text-ink text-xs font-medium py-1 px-2.5 rounded-[2px] transition-colors"
          title="Manage Gemini API Keys & Settings"
        >
          <Settings className="w-3.5 h-3.5 text-accent" />
          <span>Settings</span>
        </button>

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
