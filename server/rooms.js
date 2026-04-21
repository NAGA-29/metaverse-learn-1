const rooms = new Map();

const DEFAULT_ROOM = "main";
const POSITION_LIMIT = 1e6;

function isFinitePosition(position) {
  return (
    position &&
    typeof position === "object" &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(position.z) &&
    Math.abs(position.x) <= POSITION_LIMIT &&
    Math.abs(position.y) <= POSITION_LIMIT &&
    Math.abs(position.z) <= POSITION_LIMIT
  );
}

function getRoom(roomId = DEFAULT_ROOM) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

export function addPlayer(roomId, userId, ws) {
  const room = getRoom(roomId);
  room.set(userId, { ws, position: { x: 0, y: 1, z: 0 }, rotationY: 0, timestamp: Date.now() });
}

export function removePlayer(roomId, userId) {
  const room = getRoom(roomId);
  room.delete(userId);
}

export function updatePlayer(roomId, userId, data) {
  const room = getRoom(roomId);
  if (room.has(userId)) {
    const player = room.get(userId);
    if (isFinitePosition(data.position)) {
      player.position = data.position;
    }
    if (Number.isFinite(data.rotationY)) {
      player.rotationY = data.rotationY;
    }
    if (Number.isFinite(data.timestamp)) {
      player.timestamp = data.timestamp;
    }
  }
}

export function getPlayersData(roomId) {
  const room = getRoom(roomId);
  const data = {};
  for (const [id, player] of room.entries()) {
    data[id] = {
      position: player.position,
      rotationY: player.rotationY,
      timestamp: player.timestamp,
    };
  }
  return data;
}

export function broadcastToRoom(roomId, message, excludeUserId = null) {
  const room = getRoom(roomId);
  const payload = JSON.stringify(message);
  for (const [id, player] of room.entries()) {
    if (id !== excludeUserId && player.ws.readyState === 1) {
      player.ws.send(payload);
    }
  }
}

export function broadcastToAll(roomId, message) {
  const room = getRoom(roomId);
  const payload = JSON.stringify(message);
  for (const [, player] of room.entries()) {
    if (player.ws.readyState === 1) {
      player.ws.send(payload);
    }
  }
}
