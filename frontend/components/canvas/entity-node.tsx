"use client";

import React, { useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2, Plus, AlertCircle, Check, X, Sparkles } from "lucide-react";
import type { EntityNode } from "@/types/canvas";
import { FieldRow } from "./field-row";

export function EntityNodeComponent({
  id,
  data,
  selected,
}: NodeProps<EntityNode>) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(data.name || "entity");
  const inputRef = useRef<HTMLInputElement>(null);

  const isPreview = Boolean(data.isPreview);

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
  const issues = data.issues || [];
  const entityLevelIssues = issues.filter((i) => !i.fieldId);
  const fieldIssuesMap = new Map(issues.filter((i) => i.fieldId).map((i) => [i.fieldId, i]));

  const hasErrors = issues.some((i) => i.severity === "error");

  return (
    <div
      className={`min-w-[260px] max-w-[340px] bg-surface text-ink border rounded-[2px] transition-colors select-none ${
        isPreview
          ? "border-dashed border-accent/80 bg-surface/90 shadow-sm"
          : selected
          ? "border-accent ring-1 ring-accent"
          : hasErrors
          ? "border-error/80"
          : "border-ink"
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

      {/* Header: Entity Name & Preview Tag */}
      <div className={`flex items-center justify-between px-3 py-2 ${isPreview ? "bg-accent/5 border-b border-accent/20" : "bg-surface"}`}>
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          {hasErrors && (
            <span title="Validation issue detected" className="shrink-0 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 text-error" />
            </span>
          )}

          {isPreview && (
            <span className="flex items-center space-x-1 px-1 py-0.2 bg-accent/15 border border-accent/30 text-accent text-[9px] font-mono uppercase font-bold rounded-[2px]">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Draft</span>
            </span>
          )}

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

        {/* Header Action: Delete or Preview Discard */}
        {!isPreview ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.();
            }}
            className="ml-2 text-ink-muted hover:text-error transition-colors p-0.5"
            title="Delete entity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center space-x-1 ml-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onCommitPreview?.();
              }}
              className="flex items-center space-x-0.5 px-1.5 py-0.5 bg-accent hover:bg-accent/90 text-surface text-[10px] font-medium rounded-[2px] transition-colors"
              title="Accept this table into project"
            >
              <Check className="w-3 h-3" />
              <span>Accept</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onDiscardPreview?.();
              }}
              className="text-ink-muted hover:text-error p-0.5 transition-colors"
              title="Discard this preview table"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Entity-Level Validation Messages */}
      {entityLevelIssues.length > 0 && (
        <div className="bg-error/10 border-t border-b border-error/20 px-3 py-1 space-y-0.5 text-[11px] font-mono text-error">
          {entityLevelIssues.map((issue, idx) => (
            <div key={idx} className="flex items-center space-x-1">
              <span>•</span>
              <span className="truncate">{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hairline Divider */}
      {entityLevelIssues.length === 0 && !isPreview && <div className="border-b border-ink/20" />}

      {/* Field List Container (IBM Plex Mono) */}
      <div className="divide-y divide-ink/10">
        {fields.length === 0 ? (
          <div className="p-2.5 text-center">
            <span className="text-[11px] font-mono text-ink-muted italic">
              No fields defined
            </span>
          </div>
        ) : (
          fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              entityId={id}
              allNodes={data.allNodes}
              issue={fieldIssuesMap.get(field.id)}
              onUpdate={(updates) => data.onUpdateField?.(field.id, updates)}
              onDelete={() => data.onDeleteField?.(field.id)}
            />
          ))
        )}
      </div>

      {/* Card Footer: Add Field Action */}
      <div className="border-t border-ink/10 bg-bg/50 p-1.5 flex items-center justify-between">
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
    </div>
  );
}
