const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export function token() { return localStorage.getItem("cf_token"); }
export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  return data;
}
export const imageUrl = url => url || "";
