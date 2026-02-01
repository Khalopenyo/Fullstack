const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
let inMemoryToken = "";

export function getToken() {
  return inMemoryToken || "";
}

export function setToken(token) {
  inMemoryToken = token || "";
}

export function clearToken() {
  inMemoryToken = "";
}

async function refreshAccessToken() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = await res.json();
  if (data?.token) setToken(data.token);
  return data;
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (!headers.has("Authorization")) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  const data = isJSON ? await res.json() : await res.text();

  if (!res.ok) {
    if (res.status === 401 && !options._retry && !String(path).includes("/api/auth/refresh")) {
      try {
        await refreshAccessToken();
        return apiFetch(path, { ...options, _retry: true });
      } catch {
        // fallthrough
      }
    }
    const message = isJSON ? data?.error || res.statusText : res.statusText;
    const err = new Error(message || "Request failed");
    err.status = res.status;
    throw err;
  }

  return data;
}
