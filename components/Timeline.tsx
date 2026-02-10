"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { TimelineSnapshot, GameEvent } from "@/lib/types";

interface TimelineProps {
  snapshots: TimelineSnapshot[];
  currentYear: number;
  onRewind: (snapshotId: string) => void;
  onBranch: (snapshotId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifySnapshot(snapshot: TimelineSnapshot): "war" | "diplomacy" | "discovery" | "economy" | "default" {
  const events = snapshot.gameStateSlim.events;
  if (events.some((e: GameEvent) => e.type === "war" || e.type === "crisis")) return "war";
  if (events.some((e: GameEvent) => e.type === "diplomacy")) return "diplomacy";
  if (events.some((e: GameEvent) => e.type === "discovery")) return "discovery";
  if (events.some((e: GameEvent) => e.type === "economy")) return "economy";
  return "default";
}

const NODE_COLORS: Record<string, { fill: string; glow: string; badge: string }> = {
  war:       { fill: "bg-rose-500",    glow: "shadow-rose-500/60",    badge: "text-rose-400" },
  diplomacy: { fill: "bg-sky-500",     glow: "shadow-sky-500/60",     badge: "text-sky-400" },
  discovery: { fill: "bg-emerald-500", glow: "shadow-emerald-500/60", badge: "text-emerald-400" },
  economy:   { fill: "bg-amber-400",   glow: "shadow-amber-400/60",   badge: "text-amber-400" },
  default:   { fill: "bg-slate-400",   glow: "shadow-slate-400/40",   badge: "text-slate-400" },
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Detect branch structure
// ---------------------------------------------------------------------------

type BranchInfo = {
  branchId: string;
  parentNodeId: string | null;
  nodeIds: string[];
};

function buildBranches(snapshots: TimelineSnapshot[]): BranchInfo[] {
  if (snapshots.length === 0) return [];

  const byId = new Map(snapshots.map((s) => [s.id, s]));
  const childrenOf = new Map<string | null, TimelineSnapshot[]>();

  for (const snap of snapshots) {
    const parentId = snap.parentSnapshotId;
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(snap);
  }

  const branches: BranchInfo[] = [];
  let branchCounter = 0;

  // Find root nodes (parentSnapshotId === null or parent not in set)
  const roots = snapshots.filter(
    (s) => s.parentSnapshotId === null || !byId.has(s.parentSnapshotId)
  );

  function walk(node: TimelineSnapshot, currentBranch: BranchInfo) {
    currentBranch.nodeIds.push(node.id);
    const children = childrenOf.get(node.id) || [];

    if (children.length === 0) return;

    // First child continues the branch
    walk(children[0], currentBranch);

    // Additional children start new branches (forks)
    for (let i = 1; i < children.length; i++) {
      branchCounter++;
      const newBranch: BranchInfo = {
        branchId: `branch-${branchCounter}`,
        parentNodeId: node.id,
        nodeIds: [],
      };
      branches.push(newBranch);
      walk(children[i], newBranch);
    }
  }

  for (const root of roots) {
    branchCounter++;
    const branch: BranchInfo = {
      branchId: `branch-${branchCounter}`,
      parentNodeId: null,
      nodeIds: [],
    };
    branches.push(branch);
    walk(root, branch);
  }

  return branches;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NODE_SPACING = 140;
const NODE_RADIUS = 7;
const CURRENT_RADIUS = 11;
const BRANCH_VERTICAL_GAP = 26;
const TRACK_Y = 40;

export default function Timeline({
  snapshots,
  currentYear,
  onRewind,
  onBranch,
}: TimelineProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  // Determine the last snapshot in the primary branch as "current"
  const branches = useMemo(() => buildBranches(snapshots), [snapshots]);
  const primaryBranch = branches[0] || null;
  const currentSnapshotId = primaryBranch
    ? primaryBranch.nodeIds[primaryBranch.nodeIds.length - 1]
    : null;

  // Build a lookup: snapshotId -> { branchIndex, positionInBranch }
  const layout = useMemo(() => {
    const map = new Map<
      string,
      { x: number; y: number; branchIdx: number; posIdx: number }
    >();

    branches.forEach((branch, bIdx) => {
      let startX = 0;

      // If this branch forks from a parent, start its x from the parent node position
      if (branch.parentNodeId && map.has(branch.parentNodeId)) {
        startX = map.get(branch.parentNodeId)!.x;
      }

      const y = TRACK_Y + bIdx * BRANCH_VERTICAL_GAP;

      branch.nodeIds.forEach((nid, posIdx) => {
        map.set(nid, {
          x: startX + posIdx * NODE_SPACING + NODE_SPACING, // 1-indexed offset
          y,
          branchIdx: bIdx,
          posIdx,
        });
      });
    });

    return map;
  }, [branches]);

  const totalWidth = useMemo(() => {
    let max = 0;
    layout.forEach((pos) => {
      if (pos.x > max) max = pos.x;
    });
    return max + NODE_SPACING;
  }, [layout]);

  // Auto-scroll to the current node when it changes
  useEffect(() => {
    if (!scrollRef.current || !currentSnapshotId) return;
    const pos = layout.get(currentSnapshotId);
    if (!pos) return;

    scrollRef.current.scrollTo({
      left: pos.x - scrollRef.current.clientWidth / 2,
      behavior: "smooth",
    });
  }, [currentSnapshotId, layout]);

  // Drag-to-scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
    };
    scrollRef.current.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }, []);

  const handleNodeClick = (snapshotId: string) => {
    if (snapshotId === currentSnapshotId) return;
    setActiveId((prev) => (prev === snapshotId ? null : snapshotId));
  };

  // Render nothing meaningful if no snapshots and collapsed
  if (snapshots.length === 0 && collapsed) return null;

  return (
    <div
      className="absolute bottom-0 left-0 w-full z-30 select-none font-mono text-xs"
      style={{ pointerEvents: "auto" }}
    >
      {/* Collapse toggle tab */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-b-0 border-slate-700 rounded-t-md px-4 py-1 text-slate-400 hover:text-amber-400 transition-colors backdrop-blur-md text-[10px] uppercase tracking-widest"
      >
        {collapsed ? "Show Timeline" : "Hide Timeline"}
      </button>

      {/* Main bar */}
      <div
        className={`bg-slate-950/90 border-t border-slate-700 backdrop-blur-md transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? "max-h-0 border-t-0" : "max-h-[130px]"
        }`}
      >
        {snapshots.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-slate-600 italic">
            No timeline snapshots yet. Play a few turns to begin recording history.
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden cursor-grab"
            style={{ height: "120px" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* SVG track layer for lines and branch connectors */}
            <div className="relative" style={{ width: totalWidth, height: 120 }}>
              <svg
                className="absolute inset-0 pointer-events-none"
                width={totalWidth}
                height={120}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Branch lines */}
                {branches.map((branch, bIdx) => {
                  const nodePositions = branch.nodeIds
                    .map((nid) => layout.get(nid))
                    .filter(Boolean) as { x: number; y: number }[];

                  if (nodePositions.length < 2 && !branch.parentNodeId)
                    return null;

                  const segments: React.ReactNode[] = [];

                  // Fork connector from parent
                  if (branch.parentNodeId && layout.has(branch.parentNodeId)) {
                    const parentPos = layout.get(branch.parentNodeId)!;
                    const firstPos = nodePositions[0];
                    if (firstPos) {
                      segments.push(
                        <path
                          key={`fork-${bIdx}`}
                          d={`M ${parentPos.x} ${parentPos.y} C ${parentPos.x + 40} ${parentPos.y}, ${firstPos.x - 40} ${firstPos.y}, ${firstPos.x} ${firstPos.y}`}
                          stroke="#94a3b8"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                          fill="none"
                          opacity={0.5}
                        />
                      );
                    }
                  }

                  // Main line through branch nodes
                  for (let i = 0; i < nodePositions.length - 1; i++) {
                    const a = nodePositions[i];
                    const b = nodePositions[i + 1];
                    segments.push(
                      <line
                        key={`seg-${bIdx}-${i}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#d97706"
                        strokeWidth={2}
                        opacity={bIdx === 0 ? 0.8 : 0.4}
                      />
                    );
                  }

                  return (
                    <g key={`branch-${bIdx}`}>{segments}</g>
                  );
                })}
              </svg>

              {/* Snapshot nodes */}
              {snapshots.map((snap) => {
                const pos = layout.get(snap.id);
                if (!pos) return null;

                const isCurrent = snap.id === currentSnapshotId;
                const category = classifySnapshot(snap);
                const colors = NODE_COLORS[category];
                const r = isCurrent ? CURRENT_RADIUS : NODE_RADIUS;

                return (
                  <div
                    key={snap.id}
                    className="absolute"
                    style={{
                      left: pos.x - r,
                      top: pos.y - r,
                      width: r * 2,
                      height: r * 2,
                    }}
                  >
                    {/* The clickable node */}
                    <button
                      className={`
                        w-full h-full rounded-full border-2 transition-all duration-200
                        ${colors.fill}
                        ${isCurrent
                          ? `border-amber-300 shadow-[0_0_12px_3px] ${colors.glow} scale-110`
                          : "border-slate-600 hover:border-slate-400 hover:scale-125"
                        }
                      `}
                      onMouseEnter={() => setHoveredId(snap.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNodeClick(snap.id);
                      }}
                      aria-label={`Turn ${snap.turnYear}: ${snap.description}`}
                    />

                    {/* Year label below node */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-[10px] ${
                        isCurrent ? "text-amber-400 font-bold" : "text-slate-500"
                      }`}
                    >
                      {snap.turnYear}
                    </div>

                    {/* Description label further below */}
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-5 whitespace-nowrap text-[9px] max-w-[120px] truncate text-center ${colors.badge}`}
                    >
                      {truncate(snap.description, 22)}
                    </div>

                    {/* Hover tooltip */}
                    {hoveredId === snap.id && activeId !== snap.id && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-2xl backdrop-blur-lg pointer-events-none z-50"
                        style={{ animation: "fadeIn 150ms ease-out" }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-amber-400">
                            Year {snap.turnYear}
                          </span>
                          <span className={`text-[9px] uppercase font-bold ${colors.badge}`}>
                            {category}
                          </span>
                        </div>
                        <div className="text-slate-300 text-[11px] mb-1.5 leading-relaxed">
                          {snap.description}
                        </div>
                        <div className="text-slate-500 text-[10px] italic mb-1">
                          &gt; {truncate(snap.command, 40)}
                        </div>
                        {snap.gameStateSlim.events.length > 0 && (
                          <div className="border-t border-slate-700 pt-1.5 mt-1.5">
                            <div className="text-slate-500 text-[9px] uppercase mb-1">
                              Events
                            </div>
                            {snap.gameStateSlim.events.slice(0, 3).map((evt, i) => (
                              <div
                                key={i}
                                className="text-slate-400 text-[10px] truncate"
                              >
                                {evt.description}
                              </div>
                            ))}
                            {snap.gameStateSlim.events.length > 3 && (
                              <div className="text-slate-600 text-[9px]">
                                +{snap.gameStateSlim.events.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-slate-600 text-[9px] mt-1.5">
                          {formatTimestamp(snap.timestamp)}
                        </div>
                      </div>
                    )}

                    {/* Action popover on click */}
                    {activeId === snap.id && !isCurrent && (
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900/95 border border-slate-600 rounded-lg p-2.5 shadow-2xl backdrop-blur-lg z-50 w-44"
                        style={{ animation: "fadeIn 150ms ease-out" }}
                      >
                        <div className="text-amber-400 font-bold text-[11px] mb-2 text-center">
                          Year {snap.turnYear}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRewind(snap.id);
                            setActiveId(null);
                          }}
                          className="w-full mb-1.5 px-3 py-1.5 bg-amber-700/80 hover:bg-amber-600 text-white text-[11px] font-bold rounded transition-colors uppercase tracking-wide"
                        >
                          Rewind Here
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBranch(snap.id);
                            setActiveId(null);
                          }}
                          className="w-full px-3 py-1.5 bg-sky-700/80 hover:bg-sky-600 text-white text-[11px] font-bold rounded transition-colors uppercase tracking-wide"
                        >
                          Branch Timeline
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveId(null);
                          }}
                          className="w-full mt-1.5 px-3 py-1 text-slate-500 hover:text-slate-300 text-[10px] text-center transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current year indicator in top-right of timeline bar */}
        <div className="absolute top-2 right-3 flex items-center gap-3">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">
            Current
          </span>
          <span className="text-amber-400 font-bold text-sm">
            {currentYear}
          </span>
        </div>
      </div>

      {/* Inline keyframe for tooltip fade-in */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
