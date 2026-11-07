const BASE =
  import.meta.env.VITE_API_URL ||
  "https://campusfind-6vuu.onrender.com/api";

export function token() {
  return localStorage.getItem("cf_token");
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const currentToken = token();

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong"
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export const imageUrl = url => url || "";
