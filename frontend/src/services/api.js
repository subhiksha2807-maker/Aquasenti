import { API_URL } from "../config/env";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Tank lookup system temporarily unavailable.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "The request could not be completed.");
  }
  return response.json();
}

export const api = {
  health: () => request("/health"),
  tank: (tankId) => request(`/api/tanks/${encodeURIComponent(tankId)}`),
  dashboard: (tankId) => request(`/api/tanks/${encodeURIComponent(tankId)}/dashboard`),
  readings: (tankId, range) =>
    request(`/api/tanks/${encodeURIComponent(tankId)}/readings?${range === "24h" ? "hours=24" : `days=${range === "7d" ? 7 : 30}`}`),
  sendDemoReading: (payload) => request("/api/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Demo-Mode": "local-simulator" },
    body: JSON.stringify(payload),
  }),
};
