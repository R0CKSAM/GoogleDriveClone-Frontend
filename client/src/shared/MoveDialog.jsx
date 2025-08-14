import React, { useEffect, useState } from "react";
import { useApi } from "../api.js";

export default function MoveDialog({ open, onClose, currentParentId, onMoved, moving }) {
  const api = useApi();
  const [roots, setRoots] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      // list only root-level folders for simplicity
      const r = await api.get("/folders");
      setRoots(r.folders || []);
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-md">
        <h3 className="font-semibold mb-3">Move {moving?.type} “{moving?.name}”</h3>
        <label className="text-sm text-gray-600">Destination folder</label>
        <select
          value={selected}
          onChange={(e)=>setSelected(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2"
        >
          <option value="">/ (Root)</option>
          {roots.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button
            onClick={async ()=>{
              try {
                if (moving?.type === "file") {
                  await api.patch(`/files/${moving.id}/move`, { folder_id: selected || null });
                } else {
                  await api.patch(`/folders/${moving.id}/move`, { parent_id: selected || null });
                }
                onMoved?.();
                onClose();
              } catch (e) {
                alert("Move failed: " + e.message);
              }
            }}
            className="px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
