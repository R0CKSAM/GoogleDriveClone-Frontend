// src/shared/MoveDialog.jsx
import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../api.js";
import { Folder as FolderIcon, X } from "lucide-react";

export default function MoveDialog({ open, onClose, currentParentId, onMoved, moving }) {
  const api = useApi();
  const [folders, setFolders] = useState([]); // all folders if available
  const [roots, setRoots] = useState([]);     // root list fallback / display
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [err, setErr] = useState("");
  const didInitRef = useRef(false);
  const firstFocusRef = useRef(null);

  // IDs that are invalid as a destination (self + descendants)
  const invalidIds = useInvalidIds(moving, folders);

  // load folder lists once per open
  useEffect(() => {
    if (!open) { didInitRef.current = false; return; }
    if (didInitRef.current) return;
    didInitRef.current = true;

    setErr("");
    setSelected(currentParentId ?? "");
    setFetching(true);

    (async () => {
      try {
        // Try to get ALL folders so we can compute descendants. Fall back to roots only.
        let all = [];
        try {
          const rAll = await api.get("/folders?all=1"); // <-- adjust if your API differs
          all = rAll.folders || [];
        } catch {
          // ignore; not supported by backend
        }
        setFolders(all);

        // Always fetch/compute a root display list for the dialog
        if (all.length) {
          setRoots(all.filter(f => f.parent_id == null));
        } else {
          const r = await api.get("/folders");
          setRoots(r.folders || []);
        }
      } catch (e) {
        setErr(e.message || "Failed to load folders.");
      } finally {
        setFetching(false);
        setTimeout(() => firstFocusRef.current?.focus(), 0);
      }
    })();
  }, [open, api, currentParentId]);

  // esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const unchanged = (selected || "") === (currentParentId || "");
  const selectedIsInvalid = moving?.type === "folder" && invalidIds.has(selected || null);
  const canSubmit = !loading && !unchanged && !selectedIsInvalid;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true); setErr("");
    try {
      if (moving?.type === "file") {
        await api.patch(`/files/${moving.id}/move`, { folder_id: selected || null });
      } else {
        // extra guard in case backend lacks validation
        if (invalidIds.has(selected || null)) {
          throw new Error("You can’t move a folder into itself or its descendants.");
        }
        await api.patch(`/folders/${moving.id}/move`, { parent_id: selected || null });
      }
      onMoved?.();
      onClose?.();
    } catch (e) {
      setErr(e.message || "Move failed.");
    } finally {
      setLoading(false);
    }
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur"
      role="dialog" aria-modal="true" aria-labelledby="move-title"
      onClick={onBackdropClick}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-purple-100/70 transition duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 id="move-title" className="text-base font-semibold text-gray-900">
            Move {moving?.type === "file" ? "file" : "folder"} “{moving?.name}”
          </h3>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Destination folder</label>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {/* Root */}
            <RadioRow
              ref={firstFocusRef}
              name="dest"
              value=""
              checked={selected === ""}
              onChange={() => setSelected("")}
              icon={<FolderIcon className="h-4 w-4 text-purple-700" />}
              title="My Drive (root)"
              subtitle="Top level"
              disabled={false}
            />

            {/* Root-level folders list */}
            {fetching ? (
              <div className="text-sm text-gray-500 px-3 py-2">Loading folders…</div>
            ) : roots.length ? (
              roots.map((f) => {
                const disabled =
                  moving?.type === "folder" && invalidIds.has(f.id); // self or descendant
                return (
                  <RadioRow
                    key={f.id}
                    name="dest"
                    value={f.id}
                    checked={selected === f.id}
                    onChange={() => !disabled && setSelected(f.id)}
                    icon={<FolderIcon className="h-4 w-4 text-purple-700" />}
                    title={f.name}
                    subtitle={`Created: ${new Date(f.created_at).toLocaleDateString()}`}
                    disabled={disabled}
                  />
                );
              })
            ) : (
              <div className="text-sm text-gray-500 px-3 py-2">No folders found.</div>
            )}
          </div>

          {/* Messages */}
          {err ? (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          ) : selectedIsInvalid ? (
            <div className="mt-3 text-xs text-rose-600">
              You can’t move a folder into itself or its descendants.
            </div>
          ) : unchanged ? (
            <div className="mt-3 text-xs text-gray-500">
              Select a different destination to enable <span className="font-medium">Move</span>.
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-300 ${
              canSubmit ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-300 cursor-not-allowed"
            }`}
          >
            {loading ? "Moving…" : "Move"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */

// Build invalid id set (self + descendants) when we have the full folder list
function useInvalidIds(moving, allFolders) {
  return React.useMemo(() => {
    const set = new Set([null]); // add null? No—root is allowed. Remove:
    set.delete(null);

    if (!moving || moving.type !== "folder") return set;

    // Always forbid self
    set.add(moving.id);

    // If we have parent_id relationships, collect descendants
    if (allFolders && allFolders.length) {
      const children = new Map();
      for (const f of allFolders) {
        const pid = f.parent_id ?? null;
        if (!children.has(pid)) children.set(pid, []);
        children.get(pid).push(f);
      }
      const stack = [...(children.get(moving.id) || [])];
      while (stack.length) {
        const cur = stack.pop();
        set.add(cur.id);
        const kids = children.get(cur.id) || [];
        for (const k of kids) stack.push(k);
      }
    }
    return set;
  }, [moving, allFolders]);
}

/* Radio row */
const RadioRow = React.forwardRef(function RadioRow(
  { name, value, checked, onChange, icon, title, subtitle, disabled },
  ref
) {
  return (
    <label
      className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${
        disabled
          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
          : checked
          ? "border-purple-300 bg-purple-50/60 cursor-pointer"
          : "border-gray-200 hover:bg-gray-50 cursor-pointer"
      }`}
      aria-disabled={disabled}
    >
      <div className="flex items-center gap-3 min-w-0">
        <input
          ref={ref}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={disabled ? undefined : onChange}
          disabled={disabled}
          className="h-4 w-4 text-purple-600 focus:ring-purple-500"
        />
        <div className="rounded-md bg-purple-50 p-1.5 text-purple-700">{icon}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900" title={title}>
            {title}
          </div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
    </label>
  );
});
