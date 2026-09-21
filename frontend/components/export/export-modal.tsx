"use client";

import React, { useState, useMemo } from "react";
import { X, Download, Copy, Check, FileText, Image as ImageIcon, AlertTriangle } from "lucide-react";
import type { EntityNode, ValidationResult } from "@/types/canvas";
import { generateClientMarkdown, downloadMarkdownFile, exportCanvasAsPng } from "@/lib/export";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: EntityNode[];
  validationResult?: ValidationResult;
}

export function ExportModal({
  isOpen,
  onClose,
  nodes,
  validationResult,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const markdownContent = useMemo(
    () => generateClientMarkdown(nodes, validationResult, "Data Modeling Helper Schema"),
    [nodes, validationResult]
  );

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    downloadMarkdownFile(markdownContent, "data_dictionary.md");
  };

  const handleDownloadPng = async () => {
    try {
      setIsExportingPng(true);
      await exportCanvasAsPng(".react-flow__viewport", "erd_diagram.png");
    } catch (err) {
      console.error("Failed to export PNG:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const hasErrors = validationResult && !validationResult.isValid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface border border-ink/30 dark:border-ink-muted/30 text-ink rounded-[2px] flex flex-col max-h-[90vh] shadow-xl">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-ink/20 dark:border-ink-muted/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-sans font-semibold text-ink">
              Export Data Model & ERD
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Validation Alert Banner (if issues present) */}
        {hasErrors && (
          <div className="px-4 py-2 bg-error/10 border-b border-error/20 dark:border-error/30 flex items-center space-x-2 text-xs font-mono text-error">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Handoff Notice: {validationResult.summary.errors} unresolved error(s). These are highlighted in the exported documentation.
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Quick Export Actions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Markdown Export Box */}
            <div className="p-3 border border-ink/20 dark:border-ink-muted/25 bg-bg rounded-[2px] flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-ink">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span>Data Dictionary (Markdown)</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                  Auto-generated dictionary with entity schemas, data types, and plain-language relationship mapping.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="flex-1 flex items-center justify-center space-x-1 py-1 px-2.5 bg-accent hover:bg-accent/90 text-surface text-xs font-medium rounded-[2px] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .md</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center justify-center space-x-1 py-1 px-2 bg-surface hover:bg-bg text-ink border border-ink/30 dark:border-ink-muted/30 text-xs font-medium rounded-[2px] transition-colors"
                  title="Copy markdown to clipboard"
                >
                  {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* ERD Image Export Box */}
            <div className="p-3 border border-ink/20 dark:border-ink-muted/25 bg-bg rounded-[2px] flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-ink">
                  <ImageIcon className="w-3.5 h-3.5 text-accent" />
                  <span>Visual ERD (PNG Image)</span>
                </div>
                <p className="text-[11px] text-ink-muted mt-1 leading-snug">
                  High-resolution raster capture of the visual canvas, tables, and orthogonal relationships.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={isExportingPng}
                  className="w-full flex items-center justify-center space-x-1 py-1 px-2.5 bg-surface hover:bg-bg text-ink border border-ink/30 dark:border-ink-muted/30 text-xs font-medium rounded-[2px] transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  <span>{isExportingPng ? "Rendering..." : "Download PNG"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Markdown Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Documentation Preview
              </span>
              <span className="text-[10px] font-mono text-ink-muted">Markdown Format</span>
            </div>
            <pre className="p-3 bg-bg border border-ink/20 dark:border-ink-muted/25 rounded-[2px] text-xs font-mono text-ink overflow-x-auto max-h-[220px] whitespace-pre-wrap select-text leading-relaxed">
              {markdownContent}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-ink/10 dark:border-ink-muted/15 bg-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 bg-surface hover:bg-bg text-ink border border-ink/30 dark:border-ink-muted/30 text-xs rounded-[2px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
