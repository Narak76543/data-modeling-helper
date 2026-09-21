"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "@/components/header/header";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Canvas } from "@/components/canvas/canvas";
import { ExportModal } from "@/components/export/export-modal";
import { SettingsModal } from "@/components/settings/settings-modal";
import { GenerateProjectModal } from "@/components/sidebar/generate-project-modal";
import { PreviewBatchBanner } from "@/components/canvas/preview-batch-banner";
import { useCanvasState } from "@/hooks/use-canvas-state";
import { validateModelClientSide } from "@/lib/validation";

export default function WorkspacePage() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const {
    nodes,
    edges,
    previewBatch,
    onNodesChange,
    onEdgesChange,
    onConnect,
    applyAutoLayout,
    toggleCollapseEntity,
    addEntity,
    addAiPreviewEntity,
    addProjectPreview,
    commitProjectPreview,
    discardProjectPreview,
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
          onOpenProjectModal={() => setIsProjectModalOpen(true)}
          onDeleteEntity={deleteEntity}
          onSelectEntity={handleSelectEntity}
        />
        <main className="flex-1 h-full relative">
          {previewBatch && (
            <PreviewBatchBanner
              projectName={previewBatch.projectName}
              tableCount={previewBatch.tableCount}
              validationResult={validationResult}
              onAcceptAll={commitProjectPreview}
              onDiscardAll={discardProjectPreview}
            />
          )}

          <ReactFlowProvider>
            <Canvas
              nodes={nodes}
              edges={edges}
              validationResult={validationResult}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onAutoLayout={applyAutoLayout}
              onToggleCollapse={toggleCollapseEntity}
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

      <GenerateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectGenerated={addProjectPreview}
      />
    </div>
  );
}
