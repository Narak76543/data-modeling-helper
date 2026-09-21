"use client";

import React, { useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sparkles, Check, Trash2, Plus } from "lucide-react";
import type { EntityNode } from "@/types/canvas";
import { FieldRow } from "./field-row";

export function PreviewEntityNodeComponent({
  id,
  data,
  selected,
}: NodeProps<EntityNode>) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(data.name || "entity");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(data.name || "entity");
  }, [data.name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== data.name) {
      data.onNameChange?.(trimmed);
    } else {
      setName(data.name || "entity");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    } else if (e.key === "Escape") {
      setName(data.name || "entity");
      setIsEditingName(false);
    }
  };

  const fields = data.fields || [];

  return (
    <div
      className={`min-w-[260px] max-w-[340px] bg-surface text-ink border-2 border-dashed border-accent rounded-[2px] transition-colors select-none ${
        selected ? "ring-2 ring-accent/40" : ""
      }`}
    >
      {/* Connection Handles: 4-directional with explicit IDs for smart routing */}
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -mt-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="source-top"
        type="source"
        position={Position.Top}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -mt-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -mb-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -mb-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -ml-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="source-left"
        type="source"
        position={Position.Left}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -ml-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -mr-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-surface !border !border-ink/50 !rounded-none -mr-[5px] hover:!bg-accent hover:!border-accent transition-colors"
      />

      {/* AI Preview Banner */}
      <div className="px-3 py-1 bg-accent/10 border-b border-accent/20 flex items-center justify-between text-[11px] font-mono text-accent">
        <div className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span className="font-semibold uppercase tracking-wider">[AI Preview]</span>
        </div>
        <span className="text-[10px] text-ink-muted">Editable before adding</span>
      </div>

      {/* Header: Entity Name */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface">
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyDown}
              className="w-full text-xs font-sans font-semibold bg-bg border border-accent px-1.5 py-0.5 outline-none text-ink rounded-none"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingName(true)}
              className="text-xs font-sans font-semibold text-ink truncate cursor-text hover:text-accent tracking-wide"
              title="Double-click to rename"
            >
              {data.name}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onDiscardPreview?.();
          }}
          className="ml-2 text-ink-muted hover:text-error transition-colors p-0.5"
          title="Discard preview"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hairline Divider */}
      <div className="border-b border-ink/20" />

      {/* Field List Container */}
      <div className="divide-y divide-ink/10">
        {fields.length === 0 ? (
          <div className="p-2.5 text-center">
            <span className="text-[11px] font-mono text-ink-muted italic">
              No fields generated
            </span>
          </div>
        ) : (
          fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              entityId={id}
              allNodes={data.allNodes}
              onUpdate={(updates) => data.onUpdateField?.(field.id, updates)}
              onDelete={() => data.onDeleteField?.(field.id)}
            />
          ))
        )}
      </div>

      {/* Add Field Button */}
      <div className="border-t border-ink/10 bg-bg/50 p-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddField?.();
          }}
          className="w-full flex items-center justify-center space-x-1 py-1 px-2 text-[11px] font-mono text-ink-muted hover:text-accent hover:bg-surface border border-dashed border-ink/20 hover:border-accent rounded-[2px] transition-all"
        >
          <Plus className="w-3 h-3" />
          <span>Add Field</span>
        </button>
      </div>

      {/* Preview Confirmation Action Bar */}
      <div className="border-t-2 border-accent/20 bg-accent/5 p-2 flex items-center justify-between space-x-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onCommitPreview?.();
          }}
          className="flex-1 flex items-center justify-center space-x-1 bg-accent hover:bg-accent/90 text-surface text-xs font-medium py-1 px-2.5 rounded-[2px] transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Add to Canvas</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onDiscardPreview?.();
          }}
          className="py-1 px-2.5 bg-surface hover:bg-bg text-ink border border-ink/30 text-xs rounded-[2px] transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
