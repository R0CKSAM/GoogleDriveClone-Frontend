// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../api.js";
import UploadBox from "../shared/UploadBox.jsx";
import MoveDialog from "../shared/MoveDialog.jsx";
import { formatBytes } from "../utils/format.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Folder, Trash2, Share2, Pencil, ArrowRightLeft, Download } from "lucide-react";

export default function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
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

  const [view, setView] = useState("all"); // 'all' | 'folders' | 'files'

  // --- Search state ---
  const [q, setQ] = useState(""); // instant typing
  const [query, setQuery] = useState(""); // debounced value used for filtering

  // debounce for smoother typing
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    const qs = parentId ? `?parent_id=${parentId}` : "";
    const f1 = await api.get(`/folders${qs}`);
    const f2 = await api.get(`/folders/${parentId ?? "root"}/files`);
    setFolders(f1.folders || []);
    setFiles(f2.files || []);
  }
  useEffect(() => {
    load();
  }, [parentId]);

  const crumbs = useMemo(() => [{ id: null, name: "My Drive" }], []);
  const openFolder = (id) => setSearchParams(id ? { f: id } : {});
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied");
    } catch {
      window.prompt("Copy link", text);
    }
  };

  // ---- Folder actions ----
  async function createFolder() {
    if (!newFolder.trim()) return;
    await toast.promise(
      api.post("/folders", { name: newFolder.trim(), parent_id: parentId }),
      { loading: "Creating folder…", success: "Folder created", error: (e) => e.message }
    );
    setNewFolder("");
    load();
  }
  async function saveRenameFolder() {
    if (!renamingFolderId || !renameFolderText.trim()) return;
    await toast.promise(
      api.patch(`/folders/${renamingFolderId}`, { name: renameFolderText.trim() }),
      { loading: "Renaming…", success: "Folder renamed", error: (e) => e.message }
    );
    setRenamingFolderId(null);
    setRenameFolderText("");
    load();
  }
  async function deleteFolder(id) {
    await toast.promise(api.del(`/folders/${id}`), {
      loading: "Moving to trash…",
      success: "Folder moved to trash",
      error: (e) => e.message,
    });
    load();
  }
  function moveFolderDialog(f) {
    setMoving({ type: "folder", id: f.id, name: f.name });
    setMoveOpen(true);
  }
  function shareFolderLink(id) {
    copy(`${window.location.origin}/?f=${id}`);
  }

  // ---- File actions ----
  async function saveRenameFile() {
    if (!renamingFileId || !renameFileText.trim()) return;
    await toast.promise(
      api.patch(`/files/${renamingFileId}`, { name: renameFileText.trim() }),
      { loading: "Renaming…", success: "File renamed", error: (e) => e.message }
    );
    setRenamingFileId(null);
    setRenameFileText("");
    load();
  }
  async function deleteFile(id) {
    await toast.promise(api.del(`/files/${id}`), {
      loading: "Moving to trash…",
      success: "File moved to trash",
      error: (e) => e.message,
    });
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
  function moveFileDialog(f) {
    setMoving({ type: "file", id: f.id, name: f.name });
    setMoveOpen(true);
  }

  // --- Client-side search filtering ---
  const filteredFolders = useMemo(() => {
    if (!query) return folders;
    return folders.filter((f) => (f.name || "").toLowerCase().includes(query));
  }, [folders, query]);

  const filteredFiles = useMemo(() => {
    if (!query) return files;
    return files.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const mime = (f.mime || "").toLowerCase();
      return name.includes(query) || mime.includes(query);
    });
  }, [files, query]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-purple-50 via-white to-rose-50 text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b border-purple-100">
        <div className="px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-purple-600" />
            <span className="font-bold text-purple-800">GClone Drive</span>
          </div>

          {/* Search (functional) */}
          <div className="ml-4 flex-1 max-w-3xl">
            <label className="flex items-center gap-2 rounded-full bg-gray-100 px-4 h-10">
              <svg width="16" height="16" viewBox="0 0 20 20" className="text-gray-500">
                <path
                  fill="currentColor"
                  d="M12.9 14.32a8 8 0 1 1 1.414-1.414l3.387 3.387l-1.414 1.414l-3.387-3.387Z"
                />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent outline-none w-full text-sm"
                placeholder="Search in Drive"
                aria-label="Search"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </label>
          </div>

          {/* Simple nav to Trash (right in header if you prefer) */}
          <button onClick={() => navigate("/trash")} className="text-sm text-purple-800 hover:underline">
            Trash
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="h-[calc(100vh-56px)] grid grid-cols-12">
        {/* Sidebar */}
        <aside className="col-span-3 lg:col-span-2 h-full border-r border-purple-100 bg-white overflow-y-auto">
          <div className="p-4">
            <div className="text-xs uppercase tracking-wide text-purple-600/80 font-semibold mb-3">GDRIVE</div>

            <button
              onClick={() => openFolder(null)}
              className="w-full text-left rounded-lg px-3 py-2 text-base font-semibold text-purple-800 hover:bg-purple-50"
            >
              Home
            </button>

            {/* Create folder */}
            <div className="mt-5">
              <div className="text-sm font-medium text-gray-700 mb-2">Create folder</div>
              <div className="flex gap-2">
                <input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="New folder name"
                />
                <button
                  onClick={createFolder}
                  className="rounded-lg bg-purple-600 text-white px-4 py-2 hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Upload (just under Create folder) */}
            <div className="mt-5">
              <div className="text-sm font-medium text-gray-700 mb-2">Upload</div>
              <UploadBox onUploaded={load} parentId={parentId} />
            </div>

            {/* Filters */}
            <nav className="mt-6 space-y-1">
              <button
                onClick={() => setView("all")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  view === "all" ? "bg-purple-600/10 text-purple-800" : "hover:bg-purple-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setView("folders")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  view === "folders" ? "bg-purple-600/10 text-purple-800" : "hover:bg-purple-50"
                }`}
              >
                Folders
              </button>
              <button
                onClick={() => setView("files")}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  view === "files" ? "bg-purple-600/10 text-purple-800" : "hover:bg-purple-50"
                }`}
              >
                Files
              </button>

              <button
                onClick={() => navigate("/trash")}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-purple-50 text-purple-800"
              >
                Bin
              </button>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-9 lg:col-span-10 h-full overflow-y-auto">
          <div className="px-6 py-6">
            {/* Breadcrumb ONLY (removed centered “Home” heading) */}
            <div className="text-sm text-gray-600 mb-6">
              {crumbs.map((c, i) => (
                <span key={i} className="mr-2">
                  <button className="hover:underline" onClick={() => openFolder(c.id)}>
                    {c.name}
                  </button>
                  {i < crumbs.length - 1 && <span>/</span>}
                </span>
              ))}
              {parentId === null && <span className="ml-1 text-gray-500">/</span>}
            </div>

            {/* Folders — ONE per row (filtered) */}
            {view !== "files" && (
              <>
                <h2 className="font-bold mb-3 text-purple-900">Folders</h2>
                <div className="space-y-4 mb-10">
                  {filteredFolders.map((f) => (
                    <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      {renamingFolderId === f.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renameFolderText}
                            onChange={(e) => setRenameFolderText(e.target.value)}
                            className="border rounded px-2 py-1 flex-1"
                          />
                          <button onClick={saveRenameFolder} className="text-purple-700">
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setRenamingFolderId(null);
                              setRenameFolderText("");
                            }}
                            className="text-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="rounded-lg bg-purple-50 p-2 shrink-0">
                              <Folder className="h-5 w-5 text-purple-700" />
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => openFolder(f.id)}
                                className="font-semibold text-gray-900 hover:underline truncate"
                                title={f.name}
                              >
                                {f.name}
                              </button>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Created: {new Date(f.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <IconBtn
                              title="Rename"
                              onClick={() => {
                                setRenamingFolderId(f.id);
                                setRenameFolderText(f.name);
                              }}
                            >
                              <Pencil className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtn title="Move" onClick={() => moveFolderDialog(f)}>
                              <ArrowRightLeft className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtn title="Share" onClick={() => shareFolderLink(f.id)}>
                              <Share2 className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtnDestructive title="Delete" onClick={() => deleteFolder(f.id)}>
                              <Trash2 className="h-4 w-4" />
                            </IconBtnDestructive>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredFolders.length === 0 && (
                    <div className="text-sm text-gray-500">
                      {query ? "No folders match your search." : "No folders here yet."}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Files — ONE per row (filtered) */}
            {view !== "folders" && (
              <>
                <h2 className="font-bold mb-3 text-purple-900">Files</h2>
                <div className="space-y-4">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      {renamingFileId === file.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renameFileText}
                            onChange={(e) => setRenameFileText(e.target.value)}
                            className="border rounded px-2 py-1 flex-1"
                          />
                          <button onClick={saveRenameFile} className="text-purple-700">
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setRenamingFileId(null);
                              setRenameFileText("");
                            }}
                            className="text-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate" title={file.name}>
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {file.mime} • {formatBytes(file.size)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconBtn
                              title="Rename"
                              onClick={() => {
                                setRenamingFileId(file.id);
                                setRenameFileText(file.name);
                              }}
                            >
                              <Pencil className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtn title="Download" onClick={() => downloadFile(file.id)}>
                              <Download className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtn title="Share" onClick={() => shareFile(file.id)}>
                              <Share2 className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtn title="Move" onClick={() => moveFileDialog(file)}>
                              <ArrowRightLeft className="h-4 w-4 text-purple-700" />
                            </IconBtn>
                            <IconBtnDestructive title="Delete" onClick={() => deleteFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </IconBtnDestructive>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredFiles.length === 0 && (
                    <div className="text-sm text-gray-500">
                      {query ? "No files match your search." : "No files here yet."}
                    </div>
                  )}
                </div>
              </>
            )}

            <MoveDialog open={moveOpen} onClose={() => setMoveOpen(false)} moving={moving} onMoved={load} />
          </div>
        </main>
      </div>
    </div>
  );
}

/* --- tiny button helpers for consistent styling (icons only) --- */
function IconBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-200"
    >
      {children}
    </button>
  );
}
function IconBtnDestructive({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 text-rose-600"
    >
      {children}
    </button>
  );
}
