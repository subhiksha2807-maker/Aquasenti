const productionOrigin = typeof window !== "undefined" ? window.location.origin : "";
const productionSocketOrigin = typeof window !== "undefined"
  ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
  : "";

export const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? productionOrigin : "http://localhost:8000");
export const WS_URL = import.meta.env.VITE_WS_URL
  || (import.meta.env.PROD ? productionSocketOrigin : "ws://localhost:8000");
