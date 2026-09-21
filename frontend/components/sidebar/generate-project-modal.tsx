"use client";

import React, { useState } from "react";
import { X, Sparkles, AlertCircle, Layers, Lightbulb } from "lucide-react";
import type { AIGeneratedProject } from "@/types/project";
import { generateProjectWithAI } from "@/lib/api";

interface GenerateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectGenerated: (project: AIGeneratedProject) => void;
}

export function GenerateProjectModal({
  isOpen,
  onClose,
  onProjectGenerated,
}: GenerateProjectModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    try {
      setIsLoading(true);
      setError(null);
      setLoadingStep("Step 1/2: Decomposing domain entities...");

      const stepTimer = setTimeout(() => {
        setLoadingStep("Step 2/2: Synthesizing tables, SQL types & relationships...");
      }, 4000);

      const project = await generateProjectWithAI(cleanPrompt);
      clearTimeout(stepTimer);

      onProjectGenerated(project);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to generate project schema");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const samplePrompts = [
    "School management system (students, courses, teachers, enrollments, grades)",
    "E-commerce store (users, products, categories, orders, order_items, reviews)",
    "Hospital patient records (patients, doctors, appointments, medical_records, prescriptions)",
    "Gym membership tracker (members, plans, trainers, bookings, payments)",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none">
      <div className="w-full max-w-lg bg-surface border border-ink text-ink rounded-[2px] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-4 py-3 border-b border-ink/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-accent/10 border border-accent/30 rounded-[2px] text-accent">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-sans font-semibold text-ink">
              Generate Project with AI (Starting Draft)
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-ink-muted hover:text-ink p-1 transition-colors disabled:opacity-30"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Educational Notice Banner (FR-22) */}
        <div className="px-4 py-2.5 bg-accent/5 border-b border-ink/10 flex items-start space-x-2.5 text-[11px] text-ink-muted leading-relaxed">
          <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Teaching-First Tool:</strong> AI generates a starting architectural draft (4–8 tables with relationships). You can review cross-table links, edit fields inline, and refine before committing.
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-4 py-2 bg-error/10 border-b border-error/20 flex items-center space-x-2 text-xs font-mono text-error">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Describe your project or domain:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. University course registration system with students, departments, courses, prerequisites, and semesters"
              required
              disabled={isLoading}
              className="w-full text-xs px-3 py-2 bg-bg border border-ink/30 text-ink rounded-[2px] focus:outline-none focus:border-accent disabled:opacity-50 resize-none font-sans"
            />
          </div>

          {/* Quick Idea Chips */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block mb-1.5">
              Example Suggestions:
            </span>
            <div className="space-y-1">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(p)}
                  disabled={isLoading}
                  className="w-full text-left text-[11px] text-ink-muted hover:text-ink px-2 py-1 bg-bg hover:bg-ink/5 border border-ink/10 rounded-[2px] truncate transition-colors"
                >
                  &rarr; {p}
                </button>
              ))}
            </div>
          </div>

          {/* Loading step status */}
          {isLoading && (
            <div className="p-2.5 bg-accent/5 border border-accent/20 rounded-[2px] flex items-center space-x-2 text-xs font-mono text-accent animate-pulse">
              <Sparkles className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>{loadingStep || "Generating relational schema draft..."}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-ink/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="py-1 px-3 bg-surface hover:bg-bg text-ink border border-ink/30 text-xs rounded-[2px] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="flex items-center space-x-1.5 py-1 px-3 bg-accent hover:bg-accent/90 text-surface text-xs font-medium rounded-[2px] transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? "Generating..." : "Generate Project Draft"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
