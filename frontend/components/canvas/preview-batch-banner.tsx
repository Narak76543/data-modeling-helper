"use client";

import React from "react";
import { Check, X, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import type { ValidationResult } from "@/types/canvas";

interface PreviewBatchBannerProps {
  projectName?: string;
  tableCount: number;
  validationResult?: ValidationResult;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
}

export function PreviewBatchBanner({
  projectName,
  tableCount,
  validationResult,
  onAcceptAll,
  onDiscardAll,
}: PreviewBatchBannerProps) {
  const hasIssues = validationResult && (!validationResult.isValid || validationResult.summary.totalIssues > 0);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 select-none pointer-events-none">
      <div className="bg-surface/95 backdrop-blur border border-accent/30 dark:border-ink-muted/30 shadow-lg rounded-[2px] p-3 pointer-events-auto flex items-center justify-between space-x-4">
        {/* Information & Title */}
        <div className="flex items-start space-x-2.5 min-w-0 flex-1">
          <div className="p-1.5 bg-accent/10 border border-accent/20 dark:border-accent/25 rounded-[2px] text-accent shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-ink truncate">
                AI Starting Draft: {projectName || "Generated Project"}
              </span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-accent/10 text-accent border border-accent/20 dark:border-accent/25 rounded-[2px]">
                {tableCount} tables
              </span>
              {hasIssues ? (
                <span className="flex items-center space-x-1 text-[10px] font-mono text-warning bg-warning/10 px-1.5 py-0.2 border border-warning/20 dark:border-warning/30 rounded-[2px]">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{validationResult?.summary.totalIssues} issue(s) flagged</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-[10px] font-mono text-success bg-success/10 px-1.5 py-0.2 border border-success/20 dark:border-success/30 rounded-[2px]">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>Validation Passed</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-muted mt-0.5 leading-tight">
              Starting draft proposal — edit tables inline on canvas or accept selectively.
            </p>
          </div>
        </div>

        {/* Global Batch Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={onDiscardAll}
            className="flex items-center space-x-1 py-1 px-2.5 bg-surface hover:bg-error/10 text-ink-muted hover:text-error border border-ink/20 hover:border-error/30 text-xs font-medium rounded-[2px] transition-colors"
            title="Discard entire generated draft"
          >
            <X className="w-3.5 h-3.5" />
            <span>Discard All</span>
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="flex items-center space-x-1 py-1 px-3 bg-accent hover:bg-accent/90 text-surface text-xs font-medium rounded-[2px] transition-colors shadow-sm"
            title="Commit all draft tables and relationships"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept All ({tableCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
