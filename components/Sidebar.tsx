import React from "react";
import { Province, Player } from "@/lib/types";

interface SidebarProps {
  province: Province | null;
  owner: Player | undefined;
}

export default function Sidebar({ province, owner }: SidebarProps) {
  if (!province) {
    return (
      <div className="absolute top-4 right-4 w-64 bg-slate-800/90 text-slate-200 p-4 rounded-lg border border-slate-600 shadow-xl backdrop-blur-sm pointer-events-none select-none">
        <h2 className="text-xl font-bold mb-2">Open Historia</h2>
        <p className="text-sm text-slate-400">Select a province to view details.</p>
        <div className="mt-4 text-xs text-slate-500">
            <p>Controls:</p>
            <ul className="list-disc list-inside">
                <li>Drag to Pan</li>
                <li>Scroll to Zoom</li>
                <li>Click to Select</li>
            </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 w-72 bg-slate-900/95 text-slate-100 p-6 rounded-lg border border-slate-600 shadow-2xl backdrop-blur-md">
      <h2 className="text-2xl font-serif font-bold mb-1 text-amber-500">{province.name}</h2>
      <div className="h-px bg-slate-700 w-full mb-4"></div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ruler</label>
          <div className="flex items-center gap-2 mt-1">
            <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: owner?.color || "#475569" }}
            ></div>
            <span className="text-lg">{owner?.name || "Independent"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Population</label>
                <p className="text-lg font-mono">{province.resources.population.toLocaleString()}</p>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Defense</label>
                <p className="text-lg font-mono">{province.resources.defense}</p>
            </div>
        </div>
        
        <div className="pt-2">
             <div className="p-2 bg-slate-800 rounded border border-slate-700 text-xs text-slate-400 italic">
                "A land of {province.resources.population > 500 ? "bustling trade" : "quiet solitude"}."
             </div>
        </div>
      </div>
    </div>
  );
}
