"use client";

import React, { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { X, Key, Link2, Plus, AlertCircle, AlertTriangle } from "lucide-react";
import {
  type EntityField,
  SQL_DATA_TYPES,
  type SQLDataType,
  type ValidationIssue,
  type EntityNode,
} from "@/types/canvas";

interface FieldRowProps {
  field: EntityField;
  entityId: string;
  allNodes?: EntityNode[];
  issue?: ValidationIssue;
  onUpdate: (updates: Partial<EntityField>) => void;
  onDelete: () => void;
}

export function FieldRow({
  field,
  entityId,
  allNodes = [],
  issue,
  onUpdate,
  onDelete,
}: FieldRowProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [name, setName] = useState(field.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(field.name);
  }, [field.name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Click-outside and Escape key listener for Popover
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopoverOpen]);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== field.name) {
      onUpdate({ name: trimmed });
    } else {
      setName(field.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    } else if (e.key === "Escape") {
      setName(field.name);
      setIsEditingName(false);
    }
  };

  // Other entities available for foreign key referencing
  const targetEntityCandidates = allNodes.filter((n) => n.id !== entityId);
  const selectedTargetEntity = allNodes.find(
    (n) => n.id === field.referencesEntityId
  );
  const targetFieldCandidates = selectedTargetEntity?.data.fields || [];

  return (
    <div
      className={`relative border-b border-ink/10 dark:border-ink-muted/15 last:border-b-0 transition-colors ${
        issue
          ? issue.severity === "error"
            ? "bg-error/5"
            : "bg-ink/5"
          : field.isPrimaryKey
          ? "bg-accent/[0.03]"
          : ""
      }`}
    >
      {/* Field-level connection handles for precise row-to-row orthogonal routing */}
      <Handle
        id={`field-target-left-${field.id}`}
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-transparent !border-none !rounded-none -ml-[3px] !pointer-events-none"
      />
      <Handle
        id={`field-source-left-${field.id}`}
        type="source"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-transparent !border-none !rounded-none -ml-[3px] !pointer-events-none"
      />
      <Handle
        id={`field-target-right-${field.id}`}
        type="target"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-transparent !border-none !rounded-none -mr-[3px] !pointer-events-none"
      />
      <Handle
        id={`field-source-right-${field.id}`}
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-transparent !border-none !rounded-none -mr-[3px] !pointer-events-none"
      />

      {/* Main 5-Column Grid Row */}
      <div className="group flex items-center px-2 py-1.5 hover:bg-bg/60 text-xs font-mono select-none space-x-1.5">
        {/* Col 1: Icon Column (16px fixed, centers PK key / FK link or issue) */}
        <div className="w-4 shrink-0 flex items-center justify-center">
          {issue ? (
            <span title={issue.message} className="flex items-center">
              {issue.severity === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 text-error" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-ink-muted" />
              )}
            </span>
          ) : field.isPrimaryKey ? (
            <span title="Primary Key (PK)" className="flex items-center">
              <Key className="w-3 h-3 text-accent" />
            </span>
          ) : field.isForeignKey ? (
            <span title="Foreign Key (FK)" className="flex items-center">
              <Link2 className="w-3 h-3 text-ink-muted" />
            </span>
          ) : (
            <span className="w-3 h-3 block" />
          )}
        </div>

        {/* Col 2: Field Name Column (flex-1 min-w-0) */}
        <div className="flex-1 min-w-0 flex items-center mr-1">
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyDown}
              className="w-full text-xs font-mono bg-bg border border-accent px-1 py-0.2 outline-none text-ink rounded-none"
            />
          ) : (
            <span
              onDoubleClick={() => setIsEditingName(true)}
              className={`truncate cursor-text hover:text-accent select-text ${
                field.isPrimaryKey
                  ? "font-semibold text-ink"
                  : field.isForeignKey
                  ? "text-ink/90 italic"
                  : "text-ink"
              }`}
              title="Double-click to edit name"
            >
              {field.name}
            </span>
          )}
        </div>

        {/* Col 3: Data Type Dropdown (compact fixed width with semantic coloring) */}
        <div className="shrink-0">
          <select
            value={field.dataType}
            onChange={(e) =>
              onUpdate({ dataType: e.target.value as SQLDataType })
            }
            className="text-[11px] font-mono bg-transparent text-type hover:opacity-80 cursor-pointer border-none outline-none py-0 px-0.5 rounded-none font-medium"
            title={field.length ? `${field.dataType}(${field.length})` : field.dataType}
          >
            {SQL_DATA_TYPES.map((type) => (
              <option key={type} value={type} className="bg-surface text-type font-mono">
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Col 4: Active Constraint Chips (Single-letter: P, F, N, U - only active shown) */}
        <div className="flex items-center space-x-0.5 shrink-0">
          {field.isPrimaryKey && (
            <span
              className="text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] bg-accent text-surface"
              title="Primary Key (PK)"
            >
              P
            </span>
          )}

          {field.isForeignKey && (
            <span
              className="text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] bg-ink-muted text-surface"
              title="Foreign Key (FK)"
            >
              F
            </span>
          )}

          {!field.isNullable && (
            <span
              className="text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] bg-ink text-surface"
              title="Not Null (NN)"
            >
              N
            </span>
          )}

          {field.isUnique && !field.isPrimaryKey && (
            <span
              className="text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] border border-ink dark:border-ink-muted/60 text-ink"
              title="Unique (UQ)"
            >
              U
            </span>
          )}
        </div>

        {/* Col 5: Actions (+ Trigger for Popover & × Delete) */}
        <div className="flex items-center space-x-0.5 shrink-0 relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPopoverOpen(!isPopoverOpen);
            }}
            className={`p-0.5 rounded-[2px] transition-colors ${
              isPopoverOpen
                ? "bg-accent text-surface"
                : "text-ink-muted/70 hover:text-accent hover:bg-surface"
            }`}
            title="Edit constraints (PK/FK/NN/UQ)"
          >
            <Plus className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-muted hover:text-error transition-all"
            title="Delete field"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Constraint Popover Overlay (Anchored to + button) */}
          {isPopoverOpen && (
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 z-50 w-44 bg-surface border border-ink/30 dark:border-ink-muted/30 shadow-lg rounded-[2px] p-2 space-y-1.5 text-xs font-mono"
            >
              <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
                Constraints
              </div>

              <label className="flex items-center space-x-2 text-xs font-mono text-ink cursor-pointer hover:text-accent select-none">
                <input
                  type="checkbox"
                  checked={Boolean(field.isPrimaryKey)}
                  onChange={(e) => {
                    const nextPk = e.target.checked;
                    onUpdate({
                      isPrimaryKey: nextPk,
                      ...(nextPk ? { isNullable: false } : {}),
                    });
                  }}
                  className="w-3.5 h-3.5 accent-accent rounded-[2px] cursor-pointer"
                />
                <span>Primary Key (PK)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-mono text-ink cursor-pointer hover:text-accent select-none">
                <input
                  type="checkbox"
                  checked={Boolean(field.isForeignKey)}
                  onChange={(e) => {
                    const nextFk = e.target.checked;
                    onUpdate({
                      isForeignKey: nextFk,
                      referencesEntityId: nextFk ? targetEntityCandidates[0]?.id : undefined,
                      referencesFieldId: nextFk ? targetEntityCandidates[0]?.data.fields[0]?.id : undefined,
                    });
                  }}
                  className="w-3.5 h-3.5 accent-accent rounded-[2px] cursor-pointer"
                />
                <span>Foreign Key (FK)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-mono text-ink cursor-pointer hover:text-accent select-none">
                <input
                  type="checkbox"
                  checked={!field.isNullable}
                  onChange={(e) => onUpdate({ isNullable: !e.target.checked })}
                  className="w-3.5 h-3.5 accent-accent rounded-[2px] cursor-pointer"
                />
                <span>Not Null (NN)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-mono text-ink cursor-pointer hover:text-accent select-none">
                <input
                  type="checkbox"
                  checked={Boolean(field.isUnique)}
                  onChange={(e) => onUpdate({ isUnique: e.target.checked })}
                  className="w-3.5 h-3.5 accent-accent rounded-[2px] cursor-pointer"
                />
                <span>Unique (UQ)</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Visually Nested / Indented FK Target Reference Selector */}
      {field.isForeignKey && (
        <div className="ml-5 mr-2 mb-1 pl-2 border-l-2 border-reference/40 bg-bg/40 py-1 px-1.5 flex items-center justify-between text-[10px] font-mono text-ink-muted rounded-r-[2px]">
          <div className="flex items-center space-x-1">
            <span className="text-reference font-semibold">→ Target:</span>
            <select
              value={field.referencesEntityId || ""}
              onChange={(e) => {
                const targetEId = e.target.value;
                const targetE = allNodes.find((n) => n.id === targetEId);
                onUpdate({
                  referencesEntityId: targetEId || undefined,
                  referencesFieldId: targetE?.data.fields[0]?.id || undefined,
                });
              }}
              className="text-[10px] font-mono bg-surface border border-ink/20 dark:border-ink-muted/25 px-1 py-0.2 text-reference font-medium rounded-none outline-none max-w-[100px] truncate"
            >
              <option value="">(select entity)</option>
              {targetEntityCandidates.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.data.name}
                </option>
              ))}
            </select>

            {selectedTargetEntity && (
              <select
                value={field.referencesFieldId || ""}
                onChange={(e) =>
                  onUpdate({ referencesFieldId: e.target.value || undefined })
                }
                className="text-[10px] font-mono bg-surface border border-ink/20 dark:border-ink-muted/25 px-1 py-0.2 text-reference font-medium rounded-none outline-none max-w-[90px] truncate"
              >
                <option value="">(select field)</option>
                {targetFieldCandidates.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.isPrimaryKey ? "(PK)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          {field.defaultValue && (
            <span className="text-literal text-[9px] font-mono shrink-0 ml-1" title={`Default: ${field.defaultValue}`}>
              ={field.defaultValue}
            </span>
          )}
        </div>
      )}

      {/* Inline Field Issue Message (Indented under row) */}
      {issue && (
        <div
          className={`ml-5 mr-2 mb-1 pl-2 text-[10px] font-mono flex items-center space-x-1 ${
            issue.severity === "error" ? "text-error" : "text-ink-muted"
          }`}
        >
          <span>•</span>
          <span className="truncate">{issue.message}</span>
        </div>
      )}
    </div>
  );
}
