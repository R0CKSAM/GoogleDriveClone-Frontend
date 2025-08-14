import React, { useEffect, useState } from "react";
import { useApi } from "../api.js";
import { formatBytes } from "../utils/format.js";
import { Link } from "react-router-dom";

export default function Trash() {
  const api = useApi();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr(""); setLoading(true);
    try {
      const { files, folders } = await api.get("/trash");
      setFiles(files || []);
      setFolders(folders || []);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function restoreFile(id) { await api.post(`/restore/file/${id}`, {}); load(); }
  async function restoreFolder(id) { await api.post(`/restore/folder/${id}`, {}); load(); }
  async function hardDeleteFile(id) {
    if (!confirm("Delete this file forever?")) return;
    await api.del(`/files/${id}/hard`); load();
  }
  async function hardDeleteFolder(id) {
    if (!confirm("Delete this folder and all files forever?")) return;
    await api.del(`/folders/${id}/hard`); load();
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-rose-50">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-purple-800">Trash</h1>
            <p className="text-sm text-gray-500">Items you’ve deleted recently.</p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-800 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            Back to Drive
          </Link>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {err}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="space-y-10">

            {/* Folders */}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-purple-900">Folders</h2>

              {folders.length === 0 ? (
                <EmptyState label="No folders in trash." />
              ) : (
                <div className="space-y-3">
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{f.name}</div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          Deleted: {new Date(f.deleted_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => restoreFolder(f.id)}
                          className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => hardDeleteFolder(f.id)}
                          className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200"
                        >
                          Delete forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Files */}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-purple-900">Files</h2>

              {files.length === 0 ? (
                <EmptyState label="No files in trash." />
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{file.name}</div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {file.mime} • {formatBytes(file.size)} • Deleted:{" "}
                          {new Date(file.deleted_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => restoreFile(file.id)}
                          className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => hardDeleteFile(file.id)}
                          className="inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200"
                        >
                          Delete forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );

  /* ——— tiny empty state helper ——— */
  function EmptyState({ label }) {
    return (
      <div className="rounded-xl border border-dashed border-purple-200 bg-white/60 p-8 text-center text-sm text-gray-500">
        {label}
      </div>
    );
  }
}