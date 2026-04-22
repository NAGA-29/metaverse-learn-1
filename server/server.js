import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  addPlayer,
  removePlayer,
  updatePlayer,
  getPlayersData,
  broadcastToAll,
} from "./rooms.js";

const PORT = 3001;
const ROOM_ID = "main";
const POSITION_LIMIT = 1e6;

function sanitizeMoveMessage(msg) {
  const position = msg?.position;
  if (
    !position ||
    typeof position !== "object" ||
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    !Number.isFinite(position.z) ||
    Math.abs(position.x) > POSITION_LIMIT ||
    Math.abs(position.y) > POSITION_LIMIT ||
    Math.abs(position.z) > POSITION_LIMIT
  ) {
    return null;
  }

  if (!Number.isFinite(msg.rotationY) || !Number.isFinite(msg.timestamp)) {
    return null;
  }

  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotationY: msg.rotationY,
    timestamp: msg.timestamp,
  };
}

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  const userId = uuidv4();
  addPlayer(ROOM_ID, userId, ws);

  ws.send(JSON.stringify({ type: "init", userId }));

  broadcastToAll(ROOM_ID, {
    type: "players",
    data: getPlayersData(ROOM_ID),
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "move") {
      const sanitized = sanitizeMoveMessage(msg);
      if (!sanitized) {
        console.warn(`Invalid move payload from ${userId}`);
        return;
      }

      updatePlayer(ROOM_ID, userId, {
        position: sanitized.position,
        rotationY: sanitized.rotationY,
        timestamp: sanitized.timestamp,
      });

      broadcastToAll(ROOM_ID, {
        type: "players",
        data: getPlayersData(ROOM_ID),
      });
    }
  });

  ws.on("close", () => {
    removePlayer(ROOM_ID, userId);
    broadcastToAll(ROOM_ID, {
      type: "players",
      data: getPlayersData(ROOM_ID),
    });
    console.log(`Player disconnected: ${userId}`);
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error for ${userId}:`, err.message);
  });

  console.log(`Player connected: ${userId}`);
});
