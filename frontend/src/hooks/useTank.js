import { useEffect, useState } from 'react'
import { getDashboard, getReadings, tankSocketUrl } from '../services/api'

const normalize = (dashboard, readings) => ({ metadata: dashboard.tank, latest: dashboard.latestReading, prediction: dashboard.prediction, readings })

export function useTank(tankId) {
  const [state, setState] = useState({ tankId, tank: null, loading: true, error: null, live: false })
  useEffect(() => {
    let active = true
    let socket
    let reconnectTimer
    const load = async () => {
      try {
        const [dashboard, readings] = await Promise.all([getDashboard(tankId), getReadings(tankId, { days: 30 })])
        if (active) setState(current => ({ ...current, tankId, tank: normalize(dashboard, readings), loading: false, error: null }))
      } catch (error) {
        if (active) setState({ tankId, tank: null, loading: false, error: error.message, live: false })
      }
    }
    const connect = () => {
      if (!active) return
      socket = new WebSocket(tankSocketUrl(tankId))
      socket.onopen = () => active && setState(current => ({ ...current, live: true }))
      socket.onmessage = event => { if (JSON.parse(event.data).type === 'tank_update') load() }
      socket.onerror = () => socket.close()
      socket.onclose = event => {
        if (!active) return
        setState(current => ({ ...current, live: false }))
        if (event.code !== 4404) reconnectTimer = window.setTimeout(connect, 3000)
      }
    }
    load().then(connect)
    return () => { active = false; window.clearTimeout(reconnectTimer); socket?.close() }
  }, [tankId])
  return state.tankId === tankId ? state : { tankId, tank: null, loading: true, error: null, live: false }
}
