"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Key } from "lucide-react";
import { type EntityField, SQL_DATA_TYPES, type SQLDataType } from "@/types/canvas";

interface FieldRowProps {
  field: EntityField;
  onUpdate: (updates: Partial<EntityField>) => void;
  onDelete: () => void;
}

export function FieldRow({ field, onUpdate, onDelete }: FieldRowProps) {
  const [isEditingName, setIsEditingName] = useState(false);
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

  return (
    <div className="group flex items-center justify-between px-2.5 py-1.5 hover:bg-bg/60 border-b border-ink/10 last:border-b-0 text-xs font-mono transition-colors">
      {/* Left: PK icon & Field Name */}
      <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
        {field.isPrimaryKey && (
          <span title="Primary Key" className="shrink-0 flex items-center">
            <Key className="w-3 h-3 text-accent" />
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
              field.isPrimaryKey ? "font-semibold text-ink" : "text-ink"
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
          className="text-[11px] font-mono bg-transparent text-ink-muted hover:text-ink cursor-pointer border-none outline-none py-0 px-0.5 rounded-none"
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
            onClick={() => onUpdate({ isForeignKey: !field.isForeignKey })}
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
  );
}
