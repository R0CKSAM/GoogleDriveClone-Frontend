// src/pages/Trash.jsx
import React, { useEffect, useState } from "react";
import { useApi } from "../api.js";
import { formatBytes } from "../utils/format.js";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, RefreshCw, Folder as FolderIcon, FileText, ArrowLeft } from "lucide-react";

export default function Trash() {
  const api = useApi();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const { files, folders } = await api.get("/trash");
      setFiles(files || []);
      setFolders(folders || []);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function restoreFile(id) {
    await api.post(`/restore/file/${id}`, {});
    load();
  }
  async function restoreFolder(id) {
    await api.post(`/restore/folder/${id}`, {});
    load();
  }
  async function hardDeleteFile(id) {
    if (!confirm("Delete this file forever?")) return;
    await api.del(`/files/${id}/hard`);
    load();
  }
  async function hardDeleteFolder(id) {
    if (!confirm("Delete this folder and all files forever?")) return;
    await api.del(`/folders/${id}/hard`);
    load();
  }

  // Optional: empty trash using existing endpoints (no new API)
  async function emptyTrash() {
    if (!(files.length || folders.length)) return;
    if (!confirm("Empty the trash permanently? This cannot be undone.")) return;
    // Delete folders first (so nested items go too), then files
    for (const f of folders) {
      try { /* eslint-disable no-await-in-loop */ await api.del(`/folders/${f.id}/hard`); } catch {}
    }
    for (const f of files) {
      try { await api.del(`/files/${f.id}/hard`); } catch {}
    }
    load();
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-rose-50 text-gray-900">
      {/* Top bar – consistent with Dashboard (bigger brand) */}
      <header className="sticky top-0 z-40 w-full border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-purple-50"
            aria-label="Back to Drive"
            title="Back to Drive"
          >
            <LogoMark className="h-10 w-10" />
            <span className="tracking-tight text-2xl md:text-3xl font-bold text-gray-900">Sam Gdrive</span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Drive
            </Link>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {(files.length > 0 || folders.length > 0) && (
              <button
                onClick={emptyTrash}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                title="Empty Trash"
              >
                <Trash2 className="h-4 w-4" />
                Empty Trash
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-purple-900">Trash</h1>
          <p className="text-sm text-gray-500">Items you’ve deleted recently.</p>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-dashed border-purple-200 bg-white/60 p-8 text-center text-sm text-gray-600">
            Loading…
          </div>
        ) : (
          <div className="space-y-10">
            {/* Folders */}
            <SectionHeader title="Folders" count={folders.length} />
            {folders.length === 0 ? (
              <EmptyState label="No folders in trash." />
            ) : (
              <div className="space-y-3">
                {folders.map((f) => (
                  <TrashRow
                    key={f.id}
                    icon={<FolderIcon className="h-5 w-5 text-purple-700" />}
                    title={f.name}
                    meta={`Deleted: ${new Date(f.deleted_at).toLocaleString()}`}
                    actions={[
                      { label: "Restore", kind: "safe", onClick: () => restoreFolder(f.id) },
                      { label: "Delete forever", kind: "danger", onClick: () => hardDeleteFolder(f.id) },
                    ]}
                  />
                ))}
              </div>
            )}

            {/* Files */}
            <SectionHeader title="Files" count={files.length} />
            {files.length === 0 ? (
              <EmptyState label="No files in trash." />
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <TrashRow
                    key={file.id}
                    icon={<FileText className="h-5 w-5 text-purple-700" />}
                    title={file.name}
                    meta={`${file.mime} • ${formatBytes(file.size)} • Deleted: ${new Date(
                      file.deleted_at
                    ).toLocaleString()}`}
                    actions={[
                      { label: "Restore", kind: "safe", onClick: () => restoreFile(file.id) },
                      { label: "Delete forever", kind: "danger", onClick: () => hardDeleteFile(file.id) },
                    ]}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */

function SectionHeader({ title, count }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-purple-900">{title}</h2>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{count}</span>
    </div>
  );
}

function TrashRow({ icon, title, meta, actions = [] }) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm transition hover:shadow-md">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-lg bg-purple-50 p-2 text-purple-700">{icon}</div>
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-900" title={title}>
            {title}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">{meta}</div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions.map((a, i) =>
          a.kind === "danger" ? (
            <button
              key={i}
              onClick={a.onClick}
              className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              {a.label}
            </button>
          ) : (
            <button
              key={i}
              onClick={a.onClick}
              className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {a.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-purple-200 bg-white/60 p-8 text-center text-sm text-gray-500">
      {label}
    </div>
  );
}

/* Minimal logo to match Dashboard */
function LogoMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Sam Gdrive logo">
      <defs>
        <linearGradient id="sgd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <path
        d="M4 8.6c0-.7.37-1.35.98-1.7l6-3.3a2 2 0 0 1 2.04 0l6 3.3c.61.35.98 1.01.98 1.7v6.8c0 .7-.37 1.35-.98 1.7l-6 3.3a2 2 0 0 1-2.04 0l-6-3.3A1.98 1.98 0 0 1 4 15.4V8.6z"
        fill="url(#sgd)"
      />
      <path d="M8 12h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
