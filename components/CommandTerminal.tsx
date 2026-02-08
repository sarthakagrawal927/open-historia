"use client";

import React, { useState, useEffect, useRef } from "react";

interface LogEntry {
  id: string; // Changed to string
  type: "command" | "info" | "error" | "success";
  text: string;
}

interface CommandTerminalProps {
  logs: LogEntry[];
  onCommand: (cmd: string) => void;
}

export default function CommandTerminal({ logs, onCommand }: CommandTerminalProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input);
    setInput("");
  };

  return (
    <div className="absolute bottom-4 left-4 w-[32rem] max-w-[90vw] h-64 bg-slate-950/90 border border-slate-700 rounded-lg shadow-2xl flex flex-col font-mono text-sm overflow-hidden backdrop-blur-md">
      {/* Log Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {logs.length === 0 && (
            <div className="text-slate-500 italic">History awaits your command...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className={`
            ${log.type === "command" ? "text-slate-400 font-bold" : ""}
            ${log.type === "info" ? "text-slate-300" : ""}
            ${log.type === "error" ? "text-red-400" : ""}
            ${log.type === "success" ? "text-emerald-400" : ""}
          `}>
            {log.type === "command" && <span className="mr-2 text-slate-600">&gt;</span>}
            {log.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-2 bg-slate-900/50">
        <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold animate-pulse">&gt;</span>
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-600 focus:ring-0"
            placeholder="Enter orders (e.g., 'attack north')"
            autoFocus
            />
        </div>
      </form>
    </div>
  );
}