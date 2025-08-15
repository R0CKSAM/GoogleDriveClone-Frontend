// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../api.js";
import UploadBox from "../shared/UploadBox.jsx";
import MoveDialog from "../shared/MoveDialog.jsx";
import { formatBytes } from "../utils/format.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import {
  Folder,
  Trash2,
  Share2,
  Pencil,
  ArrowRightLeft,
  Download,
  Search,
  X,
  Home,
  Grid2X2 as GridIcon, // if this import errors, change to: Grid2x2 as GridIcon
  List as ListIcon,
  FileText,
  LogOut,
} from "lucide-react";

export default function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
  const { logout } = useAuth(); // ← use context logout
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

  const [view, setView] = useState("all");     // 'all' | 'folders' | 'files'
  const [layout, setLayout] = useState("list"); // 'list' | 'grid'
  const [sort, setSort] = useState("name_asc");

  // Search state
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  // Load lists
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

  // Logout handler — uses AuthContext to clear token so PrivateRoute redirects
  async function handleLogout() {
    try {
      await api.post("/logout"); // optional; keep if your backend supports it
    } catch (_) {
      // ignore network errors
    } finally {
      logout(); // <- clears context token
      navigate("/login", { replace: true });
    }
  }

  // Folder actions
  async function createFolder() {
    if (!newFolder.trim()) return;
    await toast.promise(api.post("/folders", { name: newFolder.trim(), parent_id: parentId }), {
      loading: "Creating folder…",
      success: "Folder created",
      error: (e) => e.message,
    });
    setNewFolder("");
    load();
  }
  async function saveRenameFolder() {
    if (!renamingFolderId || !renameFolderText.trim()) return;
    await toast.promise(api.patch(`/folders/${renamingFolderId}`, { name: renameFolderText.trim() }), {
      loading: "Renaming…",
      success: "Folder renamed",
      error: (e) => e.message,
    });
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

  // File actions
  async function saveRenameFile() {
    if (!renamingFileId || !renameFileText.trim()) return;
    await toast.promise(api.patch(`/files/${renamingFileId}`, { name: renameFileText.trim() }), {
      loading: "Renaming…",
      success: "File renamed",
      error: (e) => e.message,
    });
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

  // Filtering + sorting
  const filteredFolders = useMemo(() => {
    let arr = query ? folders.filter((f) => (f.name || "").toLowerCase().includes(query)) : folders.slice();
    return applyFolderSort(arr, sort);
  }, [folders, query, sort]);

  const filteredFiles = useMemo(() => {
    let arr = query
      ? files.filter((f) => {
          const name = (f.name || "").toLowerCase();
          const mime = (f.mime || "").toLowerCase();
          return name.includes(query) || mime.includes(query);
        })
      : files.slice();
    return applyFileSort(arr, sort);
  }, [files, query, sort]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-purple-50 via-white to-rose-50 text-gray-900">
      {/* Single clean HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          {/* Brand — bigger logo + text */}
          <button
            onClick={() => openFolder(null)}
            className="inline-flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-purple-50"
            aria-label="Sam Gdrive Home"
          >
            <LogoMark className="h-10 w-10" />
            <span className="tracking-tight text-2xl md:text-3xl font-bold text-gray-900">
              Sam Gdrive
            </span>
          </button>

          {/* Search */}
          <div className="ml-1 flex-1 max-w-3xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 w-full rounded-full bg-gray-100 pl-9 pr-10 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-purple-300"
                placeholder="Search in Drive"
                aria-label="Search"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Logout at far right */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="grid h-[calc(100vh-64px)] grid-cols-12">
        {/* Sidebar */}
        <aside className="col-span-3 h-full overflow-y-auto border-r border-purple-100 bg-white/80 lg:col-span-2">
          <div className="space-y-6 p-4">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-700/80">Navigation</div>
              <nav className="space-y-1">
                <SidebarItem icon={Home} label="Home" onClick={() => openFolder(null)} active={parentId === null} />
                <SidebarItem icon={Folder} label="All" onClick={() => setView("all")} active={view === "all"} />
                <SidebarItem icon={Folder} label="Folders" onClick={() => setView("folders")} active={view === "folders"} />
                <SidebarItem icon={Folder} label="Files" onClick={() => setView("files")} active={view === "files"} />
                <SidebarItem icon={Trash2} label="Bin" onClick={() => navigate("/trash")} />
              </nav>
            </div>

            {/* Create folder */}
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700">Create folder</div>
              <div className="flex gap-2">
                <input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="New folder name"
                />
                <button
                  onClick={createFolder}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Upload */}
            <div>
              <div className="mb-2 text-sm font-medium text-gray-700">Upload</div>
              <div className="rounded-lg border border-dashed p-3">
                <UploadBox onUploaded={load} parentId={parentId} />
              </div>
            </div>

            {/* Storage widget REMOVED as requested */}
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-9 h-full overflow-y-auto lg:col-span-10">
          <div className="mx-auto w-full max-w-7xl px-4 py-6">
            {/* Breadcrumbs + controls */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                {crumbs.map((c, i) => (
                  <span key={i} className="mr-1 inline-flex items-center gap-1">
                    <button className="truncate max-w-[160px] hover:underline" onClick={() => openFolder(c.id)}>
                      {c.name}
                    </button>
                    {i < crumbs.length - 1 && <span className="text-gray-400">/</span>}
                  </span>
                ))}
                {parentId === null && <span className="ml-1 text-gray-400">/</span>}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span>Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-md border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="name_asc">Name (A→Z)</option>
                    <option value="name_desc">Name (Z→A)</option>
                    <option value="date_desc">Newest</option>
                    <option value="date_asc">Oldest</option>
                    <option value="size_desc">Size (desc)</option>
                    <option value="size_asc">Size (asc)</option>
                  </select>
                </label>

                {/* Layout toggle */}
                <div className="inline-flex overflow-hidden rounded-lg border bg-white shadow-sm">
                  <button
                    aria-label="List view"
                    onClick={() => setLayout("list")}
                    className={`h-8 w-8 inline-flex items-center justify-center ${
                      layout === "list" ? "bg-purple-50 text-purple-800" : "hover:bg-gray-50"
                    }`}
                  >
                    <ListIcon className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Grid view"
                    onClick={() => setLayout("grid")}
                    className={`h-8 w-8 inline-flex items-center justify-center ${
                      layout === "grid" ? "bg-purple-50 text-purple-800" : "hover:bg-gray-50"
                    }`}
                  >
                    <GridIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Folders */}
            {view !== "files" && (
              <section className="mb-8">
                <SectionHeader title="Folders" count={filteredFolders.length} />
                {filteredFolders.length ? (
                  <div className={layout === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"}>
                    {filteredFolders.map((f) => (
                      <CardRow
                        key={f.id}
                        icon={<Folder className="h-5 w-5 text-purple-700" />}
                        name={f.name}
                        subtitle={`Created: ${new Date(f.created_at).toLocaleDateString()}`}
                        onPrimary={() => openFolder(f.id)}
                        isRenaming={renamingFolderId === f.id}
                        renameValue={renameFolderText}
                        setRenameValue={setRenameFolderText}
                        onSaveRename={saveRenameFolder}
                        onCancelRename={() => {
                          setRenamingFolderId(null);
                          setRenameFolderText("");
                        }}
                        onRenameStart={() => {
                          setRenamingFolderId(f.id);
                          setRenameFolderText(f.name);
                        }}
                        actions={[
                          { label: "Move", icon: ArrowRightLeft, onClick: () => moveFolderDialog(f) },
                          { label: "Share", icon: Share2, onClick: () => shareFolderLink(f.id) },
                          { label: "Delete", icon: Trash2, destructive: true, onClick: () => deleteFolder(f.id) },
                        ]}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState label={query ? "No folders match your search." : "No folders here yet."} />
                )}
              </section>
            )}

            {/* Files */}
            {view !== "folders" && (
              <section>
                <SectionHeader title="Files" count={filteredFiles.length} />
                {filteredFiles.length ? (
                  <div className={layout === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"}>
                    {filteredFiles.map((file) => (
                      <CardRow
                        key={file.id}
                        icon={<FileTypeIcon mime={file.mime} />}
                        name={file.name}
                        subtitle={`${file.mime} • ${formatBytes(file.size)}`}
                        onPrimary={() => {}}
                        isRenaming={renamingFileId === file.id}
                        renameValue={renameFileText}
                        setRenameValue={setRenameFileText}
                        onSaveRename={saveRenameFile}
                        onCancelRename={() => {
                          setRenamingFileId(null);
                          setRenameFileText("");
                        }}
                        onRenameStart={() => {
                          setRenamingFileId(file.id);
                          setRenameFileText(file.name);
                        }}
                        actions={[
                          { label: "Download", icon: Download, onClick: () => downloadFile(file.id) },
                          { label: "Share", icon: Share2, onClick: () => shareFile(file.id) },
                          { label: "Move", icon: ArrowRightLeft, onClick: () => moveFileDialog(file) },
                          { label: "Delete", icon: Trash2, destructive: true, onClick: () => deleteFile(file.id) },
                        ]}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState label={query ? "No files match your search." : "No files here yet."} />
                )}
              </section>
            )}

            <MoveDialog open={moveOpen} onClose={() => setMoveOpen(false)} moving={moving} onMoved={load} />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function applyFolderSort(arr, sort) {
  const copy = [...arr];
  switch (sort) {
    case "name_desc":
      return copy.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    case "date_desc":
      return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case "date_asc":
      return copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    default:
      return copy.sort((a, b) => (a.name || "").localeCompare(b.name || "")); // name_asc
  }
}
function applyFileSort(arr, sort) {
  const copy = [...arr];
  switch (sort) {
    case "name_desc":
      return copy.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    case "date_desc":
      return copy.sort(
        (a, b) =>
          new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0)
      );
    case "date_asc":
      return copy.sort(
        (a, b) =>
          new Date(a.created_at || a.updated_at || 0) - new Date(b.created_at || b.updated_at || 0)
      );
    case "size_desc":
      return copy.sort((a, b) => (b.size || 0) - (a.size || 0));
    case "size_asc":
      return copy.sort((a, b) => (a.size || 0) - (b.size || 0));
    default:
      return copy.sort((a, b) => (a.name || "").localeCompare(b.name || "")); // name_asc
  }
}

function SectionHeader({ title, count }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-purple-900">{title}</h2>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{count ?? 0}</span>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
        active ? "bg-purple-600/10 text-purple-900" : "text-gray-700 hover:bg-purple-50"
      }`}
    >
      <Icon className="h-4 w-4 text-purple-700" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function CardRow({
  icon,
  name,
  subtitle,
  onPrimary,
  isRenaming,
  renameValue,
  setRenameValue,
  onSaveRename,
  onCancelRename,
  onRenameStart,
  actions = [],
}) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm transition hover:shadow-md">
      <div className="flex min-w-0 items-center gap-3">
        <div className="rounded-lg bg-purple-50 p-2 text-purple-700">{icon}</div>
        <div className="min-w-0">
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="flex-1 rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={onSaveRename}
                className="rounded-md bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
              >
                Save
              </button>
              <button onClick={onCancelRename} className="rounded-md px-3 py-1 text-sm text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button onClick={onPrimary} className="truncate font-medium text-gray-900 hover:underline" title={name}>
                {name}
              </button>
              <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
            </>
          )}
        </div>
      </div>

      {!isRenaming && (
        <div className="flex shrink-0 items-center gap-1">
          <IconBtn title="Rename" onClick={onRenameStart}>
            <Pencil className="h-4 w-4 text-purple-700" />
          </IconBtn>
          {actions.map((a, idx) => (
            <IconBtn key={idx} title={a.label} onClick={a.onClick} destructive={a.destructive}>
              {<a.icon className={`h-4 w-4 ${a.destructive ? "text-rose-600" : "text-purple-700"}`} />}
            </IconBtn>
          ))}
        </div>
      )}
    </div>
  );
}

function FileTypeIcon({ mime }) {
  if ((mime || "").toLowerCase().includes("pdf")) return <FileText className="h-5 w-5 text-purple-700" />;
  return <Folder className="h-5 w-5 text-purple-700" />;
}

function EmptyState({ label }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed bg-white/60 py-10 text-sm text-gray-500">
      {label}
    </div>
  );
}

/* icon button helpers */
function IconBtn({ title, onClick, children, destructive }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md focus:outline-none focus:ring-2 ${
        destructive
          ? "hover:bg-rose-50 focus:ring-rose-200 text-rose-600"
          : "hover:bg-purple-50 focus:ring-purple-200"
      }`}
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
    >
      {children}
    </button>
  );
}

/* Minimal, professional logo */
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
