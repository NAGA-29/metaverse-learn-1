const DEFAULT_WS_PORT = "3001";
const SEND_INTERVAL_MS = 50;
const RECONNECT_DELAY_MS = 3000;

let ws = null;
let callbacks = null;
let sendTimer = null;
let lastPos = null;
let lastRotY = null;

export function initSocket({ onPlayers, onInit, getPosition, getRotationY }) {
  callbacks = { onPlayers, onInit, getPosition, getRotationY };
  connect();
}

function resolveWsUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";
  return `${protocol}//${hostname}:${DEFAULT_WS_PORT}`;
}

function connect() {
  ws = new WebSocket(resolveWsUrl());

  ws.addEventListener("open", () => {
    console.log("WebSocket connected");
    const pos = callbacks.getPosition();
    const rotY = callbacks.getRotationY();
    if (pos && Number.isFinite(rotY)) {
      lastPos = { ...pos };
      lastRotY = rotY;
      sendMove(pos, rotY);
    }
    startSending();
  });

  ws.addEventListener("message", (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }

    if (msg.type === "init") {
      callbacks.onInit(msg.userId);
    } else if (msg.type === "players") {
      callbacks.onPlayers(msg.data);
    }
  });

  ws.addEventListener("close", () => {
    console.warn("WebSocket disconnected, reconnecting in 3s...");
    stopSending();
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.addEventListener("error", (e) => {
    console.error("WebSocket error:", e);
  });
}

function startSending() {
  stopSending();
  sendTimer = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const pos = callbacks.getPosition();
    const rotY = callbacks.getRotationY();

    if (
      lastPos &&
      Math.abs(pos.x - lastPos.x) < 0.001 &&
      Math.abs(pos.y - lastPos.y) < 0.001 &&
      Math.abs(pos.z - lastPos.z) < 0.001 &&
      Math.abs(rotY - lastRotY) < 0.001
    ) {
      return;
    }

    lastPos = { ...pos };
    lastRotY = rotY;

    sendMove(pos, rotY);
  }, SEND_INTERVAL_MS);
}

function sendMove(pos, rotY) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (
    !pos ||
    !Number.isFinite(pos.x) ||
    !Number.isFinite(pos.y) ||
    !Number.isFinite(pos.z) ||
    !Number.isFinite(rotY)
  ) {
    return;
  }
  ws.send(JSON.stringify({
    type: "move",
    position: pos,
    rotationY: rotY,
    timestamp: Date.now(),
  }));
}

function stopSending() {
  if (sendTimer != null) {
    clearInterval(sendTimer);
    sendTimer = null;
  }
}
