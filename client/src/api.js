// src/api.js

// --- Normalize API base once
const RAW = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
export const API_BASE = RAW.startsWith("https://localhost:")
  ? RAW.replace(/^https:\/\//, "http://") // fix common localhost mistake
  : RAW;

// Build headers with the latest token each call
function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Unified request helper with better error messages
async function request(path, opts = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE is not set");
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...authHeader(),
    },
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {} // tolerate non-JSON

  if (!res.ok) {
    // Prefer backend error message if present
    const msg = data?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // no-content endpoints return {}
  return text ? data : {};
}

export function useApi() {
  return {
    get: (path) => request(path),

    post: (path, body) =>
      request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    patch: (path, body) =>
      request(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    del: (path) =>
      request(path, {
        method: "DELETE",
      }),

    upload: (path, file, extra = {}) => {
      const form = new FormData();
      form.append("file", file);
      for (const [k, v] of Object.entries(extra)) form.append(k, v);

      return request(path, {
        method: "POST",
        body: form,
      });
    },
  };
}
