"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Key, Plus, Trash2, ArrowUp, ArrowDown, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";
import type { ApiKeyItem } from "@/types/settings";
import { getApiKeys, createApiKey, deleteApiKey, reorderApiKeys } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [rawKey, setRawKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getApiKeys();
      setKeys(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      setError(null);
      setSuccessMsg(null);
      setLabel("");
      setRawKey("");
    }
  }, [isOpen, loadKeys]);

  if (!isOpen) return null;

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !rawKey.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const newKeyItem = await createApiKey({
        label: label.trim(),
        api_key: rawKey.trim(),
      });
      setKeys((prev) => [...prev, newKeyItem]);
      setLabel("");
      setRawKey("");
      setSuccessMsg("API key added successfully and encrypted at rest.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to add API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, keyLabel: string) => {
    if (!confirm(`Are you sure you want to remove key "${keyLabel}"?`)) return;

    try {
      setError(null);
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setSuccessMsg("API key removed.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete API key");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= keys.length) return;

    const newKeys = [...keys];
    const [movedItem] = newKeys.splice(index, 1);
    newKeys.splice(targetIndex, 0, movedItem);

    // Optimistic UI update
    setKeys(newKeys);

    try {
      const keyIds = newKeys.map((k) => k.id);
      const updated = await reorderApiKeys(keyIds);
      setKeys(updated);
    } catch (err: any) {
      setError("Failed to reorder keys");
      loadKeys(); // Rollback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 select-none">
      <div className="w-full max-w-xl bg-surface border border-ink text-ink rounded-[2px] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-ink/20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-sans font-semibold text-ink">
              API Key Management
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

        {/* Security & Rotation Notice */}
        <div className="px-4 py-2 bg-accent/5 border-b border-ink/10 flex items-start space-x-2 text-[11px] text-ink-muted">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>
            Keys are encrypted at rest with AES-128-CBC and never exposed in plaintext. AI calls automatically rotate to the next key on rate-limit (429) or quota errors.
          </span>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="px-4 py-2 bg-error/10 border-b border-error/20 flex items-center space-x-2 text-xs font-mono text-error">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="px-4 py-2 bg-success/10 border-b border-success/20 flex items-center space-x-2 text-xs font-mono text-success">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Key List Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Configured Keys ({keys.length})
              </span>
              <span className="text-[10px] text-ink-muted">Ordered by Priority</span>
            </div>

            {isLoading ? (
              <div className="p-4 border border-ink/10 bg-bg text-center text-xs font-mono text-ink-muted">
                Loading configured keys...
              </div>
            ) : keys.length === 0 ? (
              <div className="p-4 border border-ink/20 border-dashed bg-bg text-center rounded-[2px]">
                <p className="text-xs text-ink-muted">No custom API keys configured yet.</p>
                <p className="text-[11px] text-ink-muted mt-1 font-mono">
                  Gemini calls will fall back to server environment variables.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {keys.map((k, index) => (
                  <div
                    key={k.id}
                    className="p-2.5 bg-bg border border-ink/20 rounded-[2px] flex items-center justify-between space-x-3"
                  >
                    {/* Priority Badge & Details */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-surface border border-ink/20 rounded-[2px] text-accent">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-ink truncate">
                          {k.label}
                        </div>
                        <div className="text-[11px] font-mono text-ink-muted truncate tracking-wider">
                          {k.masked_key}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Priority Move & Delete */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-ink-muted hover:text-ink disabled:opacity-20 transition-colors"
                        title="Increase priority"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === keys.length - 1}
                        className="p-1 text-ink-muted hover:text-ink disabled:opacity-20 transition-colors"
                        title="Decrease priority"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-3 w-px bg-ink/20 mx-1" />
                      <button
                        type="button"
                        onClick={() => handleDelete(k.id, k.label)}
                        className="p-1 text-ink-muted hover:text-error transition-colors"
                        title="Delete key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Key Form */}
          <div className="pt-2 border-t border-ink/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-2">
              Add New Gemini API Key
            </span>

            <form onSubmit={handleAddKey} className="space-y-3 bg-bg p-3 border border-ink/20 rounded-[2px]">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">
                  Key Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Primary Developer Key, Backup Account"
                  required
                  className="w-full text-xs px-2.5 py-1.5 bg-surface border border-ink/30 text-ink rounded-[2px] focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">
                  API Key (Plaintext — Encrypted on Save)
                </label>
                <input
                  type="password"
                  value={rawKey}
                  onChange={(e) => setRawKey(e.target.value)}
                  placeholder="AIzaSy..."
                  required
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-surface border border-ink/30 text-ink rounded-[2px] focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !label.trim() || !rawKey.trim()}
                  className="flex items-center space-x-1 py-1 px-3 bg-accent hover:bg-accent/90 text-surface text-xs font-medium rounded-[2px] transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isSubmitting ? "Encrypting & Saving..." : "Add Key"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-ink/10 bg-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 bg-surface hover:bg-bg text-ink border border-ink/30 text-xs rounded-[2px] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
