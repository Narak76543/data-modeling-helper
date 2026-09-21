"use client";

import React, { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { X, Key, Link2, AlertCircle, AlertTriangle } from "lucide-react";
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
  const [showFkSelector, setShowFkSelector] = useState(false);
  const [name, setName] = useState(field.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(field.name);
  }, [field.name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

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
      className={`relative border-b border-ink/10 last:border-b-0 transition-colors ${
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

      <div className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-bg/60 text-xs font-mono">
        {/* Left: PK/FK icon & Field Name */}
        <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
          {field.isPrimaryKey ? (
            <span title="Primary Key (PK)" className="shrink-0 flex items-center">
              <Key className="w-3 h-3 text-accent" />
            </span>
          ) : field.isForeignKey ? (
            <span title="Foreign Key (FK)" className="shrink-0 flex items-center">
              <Link2 className="w-3 h-3 text-ink-muted" />
            </span>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          {issue && (
            <span
              title={issue.message}
              className="shrink-0 flex items-center"
            >
              {issue.severity === "error" ? (
                <AlertCircle className="w-3 h-3 text-error" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-ink-muted" />
              )}
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

        {/* Right: Data Type Picker & Constraints */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* SQL Type Dropdown */}
          <select
            value={field.dataType}
            onChange={(e) =>
              onUpdate({ dataType: e.target.value as SQLDataType })
            }
            className="text-[11px] font-mono bg-transparent text-ink-muted hover:text-ink cursor-pointer border-none outline-none py-0 px-0.5 rounded-none font-medium"
          >
            {SQL_DATA_TYPES.map((type) => (
              <option key={type} value={type} className="bg-surface text-ink">
                {type}
              </option>
            ))}
          </select>

          {/* Constraint Badges */}
          <div className="flex items-center space-x-0.5">
            <button
              type="button"
              onClick={() => onUpdate({ isPrimaryKey: !field.isPrimaryKey })}
              className={`text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] transition-colors ${
                field.isPrimaryKey
                  ? "bg-accent text-surface"
                  : "text-ink-muted/40 hover:text-ink hover:bg-bg"
              }`}
              title="Toggle Primary Key (PK)"
            >
              PK
            </button>

            <button
              type="button"
              onClick={() => {
                const nextFk = !field.isForeignKey;
                onUpdate({
                  isForeignKey: nextFk,
                  referencesEntityId: nextFk ? targetEntityCandidates[0]?.id : undefined,
                  referencesFieldId: nextFk ? targetEntityCandidates[0]?.data.fields[0]?.id : undefined,
                });
                if (nextFk) setShowFkSelector(true);
              }}
              className={`text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] transition-colors ${
                field.isForeignKey
                  ? "bg-ink-muted text-surface"
                  : "text-ink-muted/40 hover:text-ink hover:bg-bg"
              }`}
              title="Toggle Foreign Key (FK)"
            >
              FK
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ isNullable: !field.isNullable })}
              className={`text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] transition-colors ${
                !field.isNullable
                  ? "bg-ink text-surface"
                  : "text-ink-muted/40 hover:text-ink hover:bg-bg"
              }`}
              title="Toggle Not Null (NN)"
            >
              NN
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ isUnique: !field.isUnique })}
              className={`text-[9px] px-1 py-0.2 font-mono font-bold rounded-[2px] transition-colors ${
                field.isUnique
                  ? "border border-ink text-ink"
                  : "text-ink-muted/40 hover:text-ink hover:bg-bg"
              }`}
              title="Toggle Unique (UQ)"
            >
              UQ
            </button>
          </div>

          {/* Delete Field Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-muted hover:text-error transition-all ml-1"
            title="Delete field"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* FK Target Reference Selector Bar */}
      {field.isForeignKey && (
        <div className="px-2.5 py-1 bg-bg/80 border-t border-ink/5 flex items-center justify-between text-[10px] font-mono text-ink-muted">
          <span>→ Target:</span>
          <div className="flex items-center space-x-1">
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
              className="text-[10px] font-mono bg-surface border border-ink/20 px-1 py-0.2 text-ink rounded-none outline-none max-w-[110px] truncate"
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
                className="text-[10px] font-mono bg-surface border border-ink/20 px-1 py-0.2 text-ink rounded-none outline-none max-w-[100px] truncate"
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
        </div>
      )}

      {/* Inline Field Issue Message */}
      {issue && (
        <div
          className={`px-2.5 py-0.5 text-[10px] font-mono border-t border-ink/5 flex items-center space-x-1 ${
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
