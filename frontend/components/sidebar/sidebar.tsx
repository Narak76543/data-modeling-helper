"use client";

import React, { useState } from "react";
import { Plus, Sparkles, Trash2, ChevronLeft, ChevronRight, Check, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { EntityNode, ValidationResult } from "@/types/canvas";
import { generateEntityWithAI } from "@/lib/api";

interface SidebarProps {
  nodes: EntityNode[];
  validationResult?: ValidationResult;
  onAddEntity: () => void;
  onAddAiEntity: (entity: { name: string; fields: any[] }) => void;
  onOpenProjectModal?: () => void;
  onDeleteEntity: (id: string) => void;
  onSelectEntity?: (id: string) => void;
}

export function Sidebar({
  nodes,
  validationResult,
  onAddEntity,
  onAddAiEntity,
  onOpenProjectModal,
  onDeleteEntity,
  onSelectEntity,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showIssues, setShowIssues] = useState(true);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const errors = validationResult?.summary.errors || 0;
  const warnings = validationResult?.summary.warnings || 0;
  const issues = validationResult?.issues || [];

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    try {
      setIsGenerating(true);
      setAiError(null);
      const generated = await generateEntityWithAI(aiPrompt.trim());
      onAddAiEntity(generated);
      setAiPrompt("");
      setShowAiInput(false);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate entity with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  if (collapsed) {
    return (
      <aside className="w-8 border-r border-ink/20 dark:border-ink-muted/30 bg-surface flex flex-col items-center py-3 select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 text-ink-muted hover:text-ink transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[230px] border-r border-ink/20 dark:border-ink-muted/30 bg-surface flex flex-col justify-between select-none h-[calc(100vh-44px)]">
      {/* Top section: Entities list & Add Actions */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="p-3 border-b border-ink/10 dark:border-ink-muted/15 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">
            Entities ({nodes.length})
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="p-0.5 text-ink-muted hover:text-ink transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-2.5 space-y-1.5 border-b border-ink/10 dark:border-ink-muted/15">
          {/* Primary Action: Add Entity */}
          <button
            type="button"
            onClick={onAddEntity}
            className="w-full flex items-center justify-center space-x-1.5 bg-accent hover:bg-accent/90 text-surface text-xs font-medium py-1.5 px-3 rounded-[2px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entity</span>
          </button>

          {/* AI Action: Add Entity with AI */}
          <button
            type="button"
            onClick={() => {
              setShowAiInput(!showAiInput);
              setAiError(null);
            }}
            className="w-full flex items-center justify-center space-x-1.5 bg-surface hover:bg-bg text-accent border border-ink/20 dark:border-ink-muted/30 hover:border-ink dark:hover:border-ink-muted/50 text-xs font-medium py-1.5 px-3 rounded-[2px] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Add Table with AI</span>
          </button>

          {/* AI Project Generator: Generate Project with AI (FR-18) */}
          <button
            type="button"
            onClick={onOpenProjectModal}
            className="w-full flex items-center justify-center space-x-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 dark:border-ink-muted/30 text-xs font-medium py-1.5 px-3 rounded-[2px] transition-colors"
            title="Generate a multi-table relational draft for a full project"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Generate Project with AI</span>
          </button>

          {/* Inline AI Prompt Input */}
          {showAiInput && (
            <form onSubmit={handleAiGenerate} className="mt-2 p-2 bg-bg border border-ink/20 dark:border-ink-muted/30 rounded-[2px] space-y-1.5">
              <div className="text-[10px] font-mono text-ink-muted">Describe table (single):</div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. address table"
                disabled={isGenerating}
                className="w-full text-xs font-mono bg-surface border border-ink/30 dark:border-ink-muted/30 px-2 py-1 outline-none text-ink rounded-none placeholder:text-ink-muted/50"
                autoFocus
              />

              {aiError && (
                <div className="text-[10px] font-mono text-error leading-tight">
                  {aiError}
                </div>
              )}

              <div className="flex items-center space-x-1 pt-0.5">
                <button
                  type="submit"
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="flex-1 flex items-center justify-center space-x-1 bg-accent text-surface text-[11px] font-medium py-1 rounded-[2px] disabled:opacity-50 transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiInput(false)}
                  className="px-2 py-1 text-[11px] font-mono text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Entity List */}
        <div className="px-2 py-1 space-y-0.5 flex-1 overflow-y-auto">
          {nodes.length === 0 ? (
            <div className="p-3 text-[11px] text-ink-muted text-center italic">
              No entities yet
            </div>
          ) : (
            nodes.map((node) => {
              const nodeIssues = issues.filter((i) => i.entityId === node.id);
              const nodeHasErrors = nodeIssues.some((i) => i.severity === "error");
              const isPreview = node.type === "previewEntity";

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectEntity?.(node.id)}
                  className={`group flex items-center justify-between px-2 py-1.5 text-xs font-mono rounded-[2px] cursor-pointer transition-colors ${
                    isPreview
                      ? "border border-dashed border-accent/60 bg-accent/5 text-accent"
                      : "text-ink hover:bg-bg"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    {nodeHasErrors && (
                      <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                    )}
                    {isPreview && <Sparkles className="w-3 h-3 shrink-0 text-accent" />}
                    <span className="truncate">{node.data.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntity(node.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-muted hover:text-error transition-all"
                    title="Delete entity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom section: Real-time validation summary */}
      <div className="border-t border-ink/10 dark:border-ink-muted/15 bg-bg flex flex-col max-h-[220px]">
        <div
          onClick={() => setShowIssues(!showIssues)}
          className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-ink/5 dark:hover:bg-surface/50 transition-colors"
        >
          {errors === 0 && warnings === 0 ? (
            <div className="flex items-center space-x-1.5 text-xs text-success font-medium">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Valid ✓</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-mono">
              {errors > 0 && (
                <span className="flex items-center space-x-1 text-error font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors} {errors === 1 ? "error" : "errors"}</span>
                </span>
              )}
              {warnings > 0 && (
                <span className="flex items-center space-x-1 text-ink-muted">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{warnings} {warnings === 1 ? "warning" : "warnings"}</span>
                </span>
              )}
            </div>
          )}
          <span className="text-[10px] text-ink-muted">
            {issues.length > 0 ? (showIssues ? "Hide" : "Show") : ""}
          </span>
        </div>

        {/* Expandable issues list */}
        {showIssues && issues.length > 0 && (
          <div className="px-2.5 pb-2.5 space-y-1.5 overflow-y-auto max-h-[140px] text-[11px] font-mono border-t border-ink/10 dark:border-ink-muted/15 pt-1.5">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-1.5 rounded-[2px] leading-tight ${
                  issue.severity === "error"
                    ? "bg-error/10 text-error border border-error/20 dark:border-error/30"
                    : "bg-surface text-ink border border-ink/10 dark:border-ink-muted/20"
                }`}
              >
                <div className="font-semibold text-[10px] uppercase tracking-wider mb-0.5 opacity-80">
                  {issue.entityName}
                  {issue.fieldName ? ` • ${issue.fieldName}` : ""}
                </div>
                <div>{issue.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
