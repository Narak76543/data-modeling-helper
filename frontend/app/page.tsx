"use client";

import React, { useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "@/components/header/header";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Canvas } from "@/components/canvas/canvas";
import { useCanvasState } from "@/hooks/use-canvas-state";

export default function WorkspacePage() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addEntity,
    deleteEntity,
    renameEntity,
  } = useCanvasState();

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
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          nodes={nodes}
          onAddEntity={() => addEntity()}
          onDeleteEntity={deleteEntity}
          onSelectEntity={handleSelectEntity}
        />
        <main className="flex-1 h-full relative">
          <ReactFlowProvider>
            <Canvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onRenameEntity={renameEntity}
              onDeleteEntity={deleteEntity}
            />
          </ReactFlowProvider>
        </main>
      </div>
    </div>
  );
}
