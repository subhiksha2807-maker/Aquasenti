const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const WS_URL = (import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, 'ws')).replace(/\/$/, '')
const SENSOR_API_KEY = import.meta.env.VITE_ESP32_API_KEY || 'CHANGE_ME'

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function request(path, options = {}) {
  let response
  try { response = await fetch(`${API_URL}${path}`, options) }
  catch { throw new ApiError('Backend unavailable. Confirm FastAPI is running on port 8000.', 0) }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body.detail || `Request failed (${response.status})`, response.status)
  return body
}

export const getDashboard = tankId => request(`/api/tanks/${encodeURIComponent(tankId)}/dashboard`)
export const getReadings = (tankId, range = { days: 30 }) => request(`/api/tanks/${encodeURIComponent(tankId)}/readings?${new URLSearchParams(range)}`)
export const getTanks = () => request('/api/tanks')
export async function tankExists(tankId) {
  try { await getDashboard(tankId); return true }
  catch (error) { if (error.status === 404) return false; throw error }
}
export const sendReading = reading => request('/api/readings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': SENSOR_API_KEY, 'X-Request-ID': crypto.randomUUID() },
  body: JSON.stringify({ ...reading, measurementMode: 'calibrated' }),
})
export const tankSocketUrl = tankId => `${WS_URL}/ws/tanks/${encodeURIComponent(tankId)}`
