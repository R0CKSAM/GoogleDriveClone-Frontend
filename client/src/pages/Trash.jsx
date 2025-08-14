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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Trash</h1>
        <Link className="text-sky-700 hover:underline" to="/">Back to Drive</Link>
      </div>

      {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
      {loading ? <div>Loading…</div> : (
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold mb-2">Folders</h2>
            {folders.length === 0 ? (
              <div className="text-sm text-gray-500">No folders in trash.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {folders.map(f => (
                  <div key={f.id} className="border rounded p-3 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-500">Deleted: {new Date(f.deleted_at).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-3">
                      <button className="text-emerald-700 text-sm" onClick={()=>restoreFolder(f.id)}>Restore</button>
                      <button className="text-red-600 text-sm" onClick={()=>hardDeleteFolder(f.id)}>Delete forever</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-semibold mb-2">Files</h2>
            {files.length === 0 ? (
              <div className="text-sm text-gray-500">No files in trash.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {files.map(file => (
                  <div key={file.id} className="border rounded p-3 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {file.mime} • {formatBytes(file.size)} • Deleted: {new Date(file.deleted_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="text-emerald-700 text-sm" onClick={()=>restoreFile(file.id)}>Restore</button>
                      <button className="text-red-600 text-sm" onClick={()=>hardDeleteFile(file.id)}>Delete forever</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
