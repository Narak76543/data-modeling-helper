"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "@/components/header/header";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Canvas } from "@/components/canvas/canvas";
import { ExportModal } from "@/components/export/export-modal";
import { SettingsModal } from "@/components/settings/settings-modal";
import { useCanvasState } from "@/hooks/use-canvas-state";
import { validateModelClientSide } from "@/lib/validation";

export default function WorkspacePage() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addEntity,
    addAiPreviewEntity,
    commitPreviewEntity,
    discardPreviewEntity,
    deleteEntity,
    renameEntity,
    addField,
    updateField,
    deleteField,
  } = useCanvasState();

  // Run client-side validation mirror on every canvas update
  const validationResult = useMemo(
    () => validateModelClientSide(nodes),
    [nodes]
  );

  const handleSelectEntity = useCallback(
    (nodeId: string) => {
      onNodesChange([
        {
          id: nodeId,
          type: "select",
          selected: true,
        },
      ]);
    },
    [onNodesChange]
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg">
      <Header
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          nodes={nodes}
          validationResult={validationResult}
          onAddEntity={() => addEntity()}
          onAddAiEntity={addAiPreviewEntity}
          onDeleteEntity={deleteEntity}
          onSelectEntity={handleSelectEntity}
        />
        <main className="flex-1 h-full relative">
          <ReactFlowProvider>
            <Canvas
              nodes={nodes}
              edges={edges}
              validationResult={validationResult}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onRenameEntity={renameEntity}
              onDeleteEntity={deleteEntity}
              onAddField={addField}
              onUpdateField={updateField}
              onDeleteField={deleteField}
              onCommitPreview={commitPreviewEntity}
              onDiscardPreview={discardPreviewEntity}
            />
          </ReactFlowProvider>
        </main>
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        nodes={nodes}
        validationResult={validationResult}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
