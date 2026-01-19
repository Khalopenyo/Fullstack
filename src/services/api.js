const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";
const TOKEN_KEY = "auth:token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function clearToken() {
  setToken("");
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
  });

  const contentType = res.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  const data = isJSON ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJSON ? data?.error || res.statusText : res.statusText;
    const err = new Error(message || "Request failed");
    err.status = res.status;
    throw err;
  }

  return data;
}
