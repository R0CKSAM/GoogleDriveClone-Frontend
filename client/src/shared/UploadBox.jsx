// src/shared/UploadBox.jsx
import React, { useRef, useState } from "react";
import { useApi } from "../api.js";
import { Upload, FolderUp, Loader2, Info } from "lucide-react";

export default function UploadBox({ onUploaded, parentId }) {
  const api = useApi();
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setProgressText("Uploading file…");
    setProgressPct(30);
    try {
      await api.upload("/files/upload", file, { folder_id: parentId ?? "" });
      setProgressPct(100);
      onUploaded?.();
    } catch (err) {
      alert("Upload failed: " + (err?.message || "unknown error"));
    } finally {
      resetInputs(e.target);
    }
  }

  async function onPickFolder(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setBusy(true);
    setProgressPct(0);
    try {
      // cache created/loaded folder ids to reduce calls
      const folderCache = new Map(); // key: `${parentId || 'root'}/${name}` -> id

      async function ensureChildFolder(parent, name) {
        const key = `${parent || "root"}/${name}`;
        if (folderCache.has(key)) return folderCache.get(key);

        const qs = parent ? `?parent_id=${parent}` : "";
        const { folders } = await api.get(`/folders${qs}`);
        let found = (folders || []).find((f) => f.name === name);
        if (!found) {
          const { folder } = await api.post("/folders", { name, parent_id: parent || null });
          found = folder;
        }
        folderCache.set(key, found.id);
        return found.id;
      }

      const topName = files[0].webkitRelativePath.split("/")[0];
      const topId = await ensureChildFolder(parentId || null, topName);

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgressText(`Uploading ${i + 1} / ${files.length}…`);
        setProgressPct(Math.round(((i + 1) / files.length) * 100));

        const parts = f.webkitRelativePath.split("/"); // Top/sub/child/file.ext
        const dirParts = parts.slice(1, -1); // skip Top, remove filename

        let currentParent = topId;
        for (const seg of dirParts) {
          currentParent = await ensureChildFolder(currentParent, seg);
        }
        await api.upload("/files/upload", f, { folder_id: currentParent || "" });
      }

      onUploaded?.();
    } catch (err) {
      console.error(err);
      alert("Folder upload failed: " + (err?.message || "unknown error"));
    } finally {
      resetInputs(e.target);
    }
  }

  function resetInputs(inputEl) {
    setBusy(false);
    setProgressText("");
    setProgressPct(0);
    if (inputEl) inputEl.value = "";
  }

  return (
    <div className="rounded-xl border border-dashed border-purple-200 bg-white/60 p-4">
      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
            ${busy ? "bg-emerald-200 text-emerald-900 cursor-not-allowed" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"}`}
          aria-disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy && progressText ? progressText : "Upload File"}
        </button>

        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition
            ${busy ? "bg-sky-200 text-sky-900 cursor-not-allowed" : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"}`}
          aria-disabled={busy}
          title="Upload a folder (Chrome/Edge supported)"
        >
          <FolderUp className="h-4 w-4" />
          Upload Folder
        </button>

        <span className="ml-auto hidden md:inline-flex items-center gap-1 text-xs text-gray-500">
          <Info className="h-3.5 w-3.5" />
          Folder upload works on Chromium browsers.
        </span>
      </div>

      {/* Progress bar */}
      {busy && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-gray-500">{progressPct}%</div>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" hidden onChange={onPickFile} />
      <input
        ref={folderInputRef}
        type="file"
        hidden
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={onPickFolder}
      />
    </div>
  );
}
