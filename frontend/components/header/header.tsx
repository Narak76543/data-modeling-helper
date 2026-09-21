"use client";

import React from "react";

export function Header() {
  return (
    <header className="h-11 border-b border-ink/20 bg-surface px-4 flex items-center justify-between select-none">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold tracking-tight text-ink font-sans">
          Data Modeling Helper
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-xs font-mono text-ink-muted">Phase 2 — Canvas</span>
      </div>
    </header>
  );
}
