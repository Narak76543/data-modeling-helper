"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { EntityNode } from "@/types/canvas";

interface SidebarProps {
  nodes: EntityNode[];
  onAddEntity: () => void;
  onDeleteEntity: (id: string) => void;
  onSelectEntity?: (id: string) => void;
}

export function Sidebar({
  nodes,
  onAddEntity,
  onDeleteEntity,
  onSelectEntity,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="w-8 border-r border-ink/20 bg-surface flex flex-col items-center py-3 select-none">
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
    <aside className="w-[220px] border-r border-ink/20 bg-surface flex flex-col justify-between select-none h-[calc(100vh-44px)]">
      {/* Top section: Entities list */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="p-3 border-b border-ink/10 flex items-center justify-between">
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

        {/* Add Entity Button (Primary Action) */}
        <div className="p-2.5">
          <button
            type="button"
            onClick={onAddEntity}
            className="w-full flex items-center justify-center space-x-1.5 bg-accent hover:bg-accent/90 text-surface text-xs font-medium py-1.5 px-3 rounded-[2px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entity</span>
          </button>
        </div>

        {/* Entity List */}
        <div className="px-2 py-1 space-y-0.5 flex-1">
          {nodes.length === 0 ? (
            <div className="p-3 text-[11px] text-ink-muted text-center italic">
              No entities yet
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => onSelectEntity?.(node.id)}
                className="group flex items-center justify-between px-2 py-1.5 text-xs font-mono text-ink hover:bg-bg rounded-[2px] cursor-pointer transition-colors"
              >
                <span className="truncate">{node.data.name}</span>
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
            ))
          )}
        </div>
      </div>

      {/* Bottom section: Validation summary */}
      <div className="p-3 border-t border-ink/10 bg-bg">
        <div className="flex items-center space-x-1.5 text-xs text-success font-medium">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Valid</span>
        </div>
        <div className="text-[11px] text-ink-muted mt-0.5">
          {nodes.length} {nodes.length === 1 ? "entity" : "entities"} on canvas
        </div>
      </div>
    </aside>
  );
}
