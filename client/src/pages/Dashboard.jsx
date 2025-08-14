import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../api.js";
import UploadBox from "../shared/UploadBox.jsx";
import MoveDialog from "../shared/MoveDialog.jsx";
import { formatBytes } from "../utils/format.js";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Folder, Trash2, Share2, Pencil, ArrowRightLeft, Download } from "lucide-react";

export default function Dashboard() {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const parentId = searchParams.get("f") || null;

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);

  const [newFolder, setNewFolder] = useState("");

  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameFolderText, setRenameFolderText] = useState("");

  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renameFileText, setRenameFileText] = useState("");

  const [moveOpen, setMoveOpen] = useState(false);
  const [moving, setMoving] = useState(null);

  async function load() {
    const qs = parentId ? `?parent_id=${parentId}` : "";
    const f1 = await api.get(`/folders${qs}`);
    const f2 = await api.get(`/folders/${parentId ?? "root"}/files`);
    setFolders(f1.folders || []);
    setFiles(f2.files || []);
  }
  useEffect(() => { load(); }, [parentId]);

  const crumbs = useMemo(() => [{ id: null, name: "My Drive" }], []);
  const openFolder = (id) => setSearchParams(id ? { f: id } : {});
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success("Link copied"); }
    catch { window.prompt("Copy link", text); }
  };

  // ---- Folder actions ----
  async function createFolder() {
    if (!newFolder.trim()) return;
    await toast.promise(
      api.post("/folders", { name: newFolder.trim(), parent_id: parentId }),
      { loading: "Creating folder…", success: "Folder created", error: (e)=>e.message }
    );
    setNewFolder(""); load();
  }
  async function saveRenameFolder() {
    if (!renamingFolderId || !renameFolderText.trim()) return;
    await toast.promise(
      api.patch(`/folders/${renamingFolderId}`, { name: renameFolderText.trim() }),
      { loading: "Renaming…", success: "Folder renamed", error: (e)=>e.message }
    );
    setRenamingFolderId(null); setRenameFolderText(""); load();
  }
  async function deleteFolder(id) {
    await toast.promise(
      api.del(`/folders/${id}`),
      { loading: "Moving to trash…", success: "Folder moved to trash", error: (e)=>e.message }
    );
    load();
  }
  function moveFolderDialog(f) { setMoving({ type: "folder", id: f.id, name: f.name }); setMoveOpen(true); }
  function shareFolderLink(id) { copy(`${window.location.origin}/?f=${id}`); }

  // ---- File actions ----
  async function saveRenameFile() {
    if (!renamingFileId || !renameFileText.trim()) return;
    await toast.promise(
      api.patch(`/files/${renamingFileId}`, { name: renameFileText.trim() }),
      { loading: "Renaming…", success: "File renamed", error: (e)=>e.message }
    );
    setRenamingFileId(null); setRenameFileText(""); load();
  }
  async function deleteFile(id) {
    await toast.promise(
      api.del(`/files/${id}`),
      { loading: "Moving to trash…", success: "File moved to trash", error: (e)=>e.message }
    );
    load();
  }
  async function downloadFile(id) {
    const { url } = await api.get(`/files/${id}/download`);
    window.open(url, "_blank");
  }
  async function shareFile(id) {
    const { url } = await api.get(`/files/${id}/download`);
    copy(url);
  }
  function moveFileDialog(f) { setMoving({ type: "file", id: f.id, name: f.name }); setMoveOpen(true); }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">

      {/* Simple breadcrumb (no duplicate "Root") */}
      <div className="text-sm text-gray-600 mb-4">
        {crumbs.map((c, i) => (
          <span key={i} className="mr-2">
            <button className="hover:underline" onClick={() => openFolder(c.id)}>{c.name}</button>
            {i < crumbs.length - 1 && <span>/</span>}
          </span>
        ))}
        {parentId === null && <span className="ml-1 text-gray-500">/</span>}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          value={newFolder}
          onChange={(e)=>setNewFolder(e.target.value)}
          className="border rounded-lg px-3 py-2 w-56"
          placeholder="New folder name"
        />
        <button
          onClick={createFolder}
          className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg"
        >
          Create Folder
        </button>
        <UploadBox onUploaded={load} parentId={parentId} />
      </div>

      {/* Folders */}
      <h2 className="font-semibold mb-2">Folders</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {folders.map(f => (
          <div key={f.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-lg bg-sky-50 p-2">
                <Folder className="h-5 w-5 text-sky-700" />
              </div>

              <div className="flex-1">
                {renamingFolderId === f.id ? (
                  <div className="flex gap-2">
                    <input
                      value={renameFolderText}
                      onChange={(e)=>setRenameFolderText(e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                    <button onClick={saveRenameFolder} className="text-sky-700">Save</button>
                    <button onClick={()=>{setRenamingFolderId(null); setRenameFolderText("");}} className="text-gray-500">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={()=>openFolder(f.id)} className="font-medium hover:underline text-sky-800">
                      {f.name}
                    </button>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </>
                )}

                {renamingFolderId !== f.id && (
                  <div className="flex flex-wrap gap-3 mt-3 text-sm">
                    <Action onClick={()=>{setRenamingFolderId(f.id); setRenameFolderText(f.name);}} icon={<Pencil className="h-4 w-4" />}>Rename</Action>
                    <Action onClick={()=>moveFolderDialog(f)} icon={<ArrowRightLeft className="h-4 w-4" />}>Move</Action>
                    <Danger onClick={()=>deleteFolder(f.id)} icon={<Trash2 className="h-4 w-4" />}>Delete</Danger>
                    <Action onClick={()=>shareFolderLink(f.id)} icon={<Share2 className="h-4 w-4" />}>Share</Action>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {folders.length === 0 && <div className="text-sm text-gray-500">No folders here yet.</div>}
      </div>

      {/* Files */}
      <h2 className="font-semibold mb-2">Files</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map(file => (
          <div key={file.id} className="rounded-xl border bg-white p-4 shadow-sm">
            {renamingFileId === file.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={renameFileText}
                  onChange={(e)=>setRenameFileText(e.target.value)}
                  className="border rounded px-2 py-1 flex-1"
                />
                <button onClick={saveRenameFile} className="text-sky-700">Save</button>
                <button onClick={()=>{setRenamingFileId(null); setRenameFileText("");}} className="text-gray-500">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-gray-500">{file.mime} • {formatBytes(file.size)}</div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Action onClick={()=>{setRenamingFileId(file.id); setRenameFileText(file.name);}} icon={<Pencil className="h-4 w-4" />}>Rename</Action>
                  <Action onClick={()=>downloadFile(file.id)} icon={<Download className="h-4 w-4" />}>Download</Action>
                  <Action onClick={()=>shareFile(file.id)} icon={<Share2 className="h-4 w-4" />}>Share</Action>
                  <Action onClick={()=>moveFileDialog(file)} icon={<ArrowRightLeft className="h-4 w-4" />}>Move</Action>
                  <Danger onClick={()=>deleteFile(file.id)} icon={<Trash2 className="h-4 w-4" />}>Delete</Danger>
                </div>
              </div>
            )}
          </div>
        ))}
        {files.length === 0 && <div className="text-sm text-gray-500">No files here yet.</div>}
      </div>

      {/* Move modal */}
      <MoveDialog
        open={moveOpen}
        onClose={()=>setMoveOpen(false)}
        moving={moving}
        onMoved={load}
      />
    </div>
  );
}

/* --- tiny button helpers for consistent styling --- */
function Action({ onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800"
    >
      {icon}{children}
    </button>
  );
}
function Danger({ onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700"
    >
      {icon}{children}
    </button>
  );
}
