import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../config/env";

export function useTankSocket(tankId, onUpdate) {
  const [connected, setConnected] = useState(false);
  const callback = useRef(onUpdate);
  callback.current = onUpdate;

  useEffect(() => {
    if (!tankId) return undefined;
    let socket;
    let retry;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(`${WS_URL}/ws/tanks/${encodeURIComponent(tankId)}`);
      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => {
        try { callback.current(JSON.parse(event.data)); } catch { /* Ignore malformed updates. */ }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!stopped) retry = window.setTimeout(connect, 3000);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      socket?.close();
    };
  }, [tankId]);
  return connected;
}
