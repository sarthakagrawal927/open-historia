"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { uploadLocalSavesToCloud, localListSavedGames } from "@/lib/game-storage";

interface UserMenuProps {
  user: { name: string; email: string };
  onRefreshSaves?: () => void;
}

export default function UserMenu({ user, onRefreshSaves }: UserMenuProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  const handleUpload = async () => {
    const localSaves = localListSavedGames();
    if (localSaves.length === 0) {
      setUploadResult("No local saves to upload.");
      setTimeout(() => setUploadResult(null), 3000);
      return;
    }

    setUploading(true);
    try {
      const count = await uploadLocalSavesToCloud();
      setUploadResult(`Uploaded ${count} save${count !== 1 ? "s" : ""} to cloud.`);
      onRefreshSaves?.();
    } catch (err) {
      console.error(err);
      setUploadResult("Upload failed. Try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadResult(null), 3000);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 hidden sm:inline">
        {user.name || user.email}
      </span>
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="text-[11px] uppercase bg-sky-800 hover:bg-sky-700 disabled:opacity-50 text-white font-bold px-2 py-1 rounded transition-colors"
        title="Upload local saves to cloud"
      >
        {uploading ? "Uploading..." : "Upload Saves"}
      </button>
      <button
        onClick={handleSignOut}
        className="text-[11px] uppercase bg-slate-700 hover:bg-slate-600 text-white font-bold px-2 py-1 rounded transition-colors"
      >
        Sign Out
      </button>
      {uploadResult && (
        <span className="text-[11px] text-emerald-400">{uploadResult}</span>
      )}
    </div>
  );
}
