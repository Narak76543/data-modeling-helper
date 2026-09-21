"use client";

import React, { useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import type { EntityNode } from "@/types/canvas";

export function EntityNodeComponent({
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

  return (
    <div
      className={`min-w-[190px] max-w-[260px] bg-surface text-ink border rounded-[2px] transition-colors select-none ${
        selected ? "border-accent ring-1 ring-accent" : "border-ink"
      }`}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-surface !border !border-ink !rounded-none -ml-[5px]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-accent !border !border-accent !rounded-none -mr-[5px]"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-surface !border !border-ink !rounded-none -mt-[5px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-accent !border !border-accent !rounded-none -mb-[5px]"
      />

      {/* Header: Entity Name */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface">
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="w-full text-xs font-mono font-semibold bg-bg border border-accent px-1 py-0.5 outline-none text-ink rounded-none"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditingName(true)}
            className="text-xs font-mono font-semibold text-ink truncate cursor-text hover:text-accent"
            title="Double-click to rename"
          >
            {data.name}
          </span>
        )}

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
      </div>

      {/* Hairline Divider */}
      <div className="border-b border-ink/20" />

      {/* Field List Container (FR-2 placeholder) */}
      <div className="p-2.5 min-h-[36px] flex items-center justify-center">
        <span className="text-[11px] font-mono text-ink-muted italic">
          No fields defined
        </span>
      </div>
    </div>
  );
}
