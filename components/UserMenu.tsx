"use client";

import React, { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { uploadLocalSavesToCloud, localListSavedGames } from "@/lib/game-storage";

const UPLOAD_PROMPTED_KEY = "oh_upload_prompted";

interface UserMenuProps {
  user: { name: string; email: string };
  onRefreshSaves?: () => void;
}

export default function UserMenu({ user, onRefreshSaves }: UserMenuProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);

  // On first sign-in, check if there are local saves to offer uploading
  useEffect(() => {
    const alreadyPrompted = localStorage.getItem(UPLOAD_PROMPTED_KEY);
    if (alreadyPrompted) return;
    const localSaves = localListSavedGames();
    if (localSaves.length > 0) {
      setShowUploadPrompt(true);
    }
  }, []);

  const handleUpload = async () => {
    setShowUploadPrompt(false);
    localStorage.setItem(UPLOAD_PROMPTED_KEY, "1");

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

  const dismissPrompt = () => {
    setShowUploadPrompt(false);
    localStorage.setItem(UPLOAD_PROMPTED_KEY, "1");
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Upload prompt banner */}
      {showUploadPrompt && (
        <div className="bg-sky-900/80 border border-sky-700 rounded-lg px-3 py-2 text-xs text-sky-200 flex items-center gap-2 backdrop-blur">
          <span>Upload your local saves to the cloud?</span>
          <button
            onClick={handleUpload}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-2 py-0.5 rounded text-[11px] uppercase"
          >
            Upload
          </button>
          <button
            onClick={dismissPrompt}
            className="text-sky-400 hover:text-sky-300 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

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
    </div>
  );
}
