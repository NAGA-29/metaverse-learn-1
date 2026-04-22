import * as THREE from "three";

const LERP_FACTOR = 0.18;
const POSITION_LIMIT = 1e6;
const HEAD_SIZE = 0.5;

function isValidPlayerState(info) {
  const position = info?.position;
  return (
    position &&
    typeof position === "object" &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(position.z) &&
    Math.abs(position.x) <= POSITION_LIMIT &&
    Math.abs(position.y) <= POSITION_LIMIT &&
    Math.abs(position.z) <= POSITION_LIMIT &&
    Number.isFinite(info.rotationY)
  );
}

function createAvatarMesh() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff6644 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xff8866 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.15;
  head.castShadow = true;
  group.add(head);

  const faceGeo = new THREE.PlaneGeometry(0.26, 0.18);
  const faceMat = new THREE.MeshBasicMaterial({ color: 0xfff36b });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, 1.15, HEAD_SIZE / 2 + 0.001);
  group.add(face);

  return group;
}

function createLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5, 0.4, 1);
  sprite.position.y = 1.8;
  return sprite;
}

function disposeMaterial(material) {
  if (!material) return;
  for (const value of Object.values(material)) {
    if (value && value.isTexture) {
      value.dispose();
    }
  }
  material.dispose();
}

function cleanupPlayerResources(group) {
  group.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === "function") {
      obj.geometry.dispose();
    }
    if (!obj.material) return;
    if (Array.isArray(obj.material)) {
      obj.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(obj.material);
    }
  });
}

export class RemotePlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
  }

  update(serverData, localUserId) {
    const serverIds = new Set(Object.keys(serverData));

    for (const [id, info] of Object.entries(serverData)) {
      if (id === localUserId) continue;
      if (!isValidPlayerState(info)) continue;

      if (!this.players.has(id)) {
        const group = createAvatarMesh();
        const label = createLabel(id.slice(0, 4));
        group.add(label);
        this.scene.add(group);
        this.players.set(id, {
          group,
          targetPos: new THREE.Vector3(info.position.x, info.position.y, info.position.z),
          targetRotY: info.rotationY,
        });
      } else {
        const p = this.players.get(id);
        p.targetPos.set(info.position.x, info.position.y, info.position.z);
        p.targetRotY = info.rotationY;
      }
    }

    for (const [id] of this.players) {
      if (!serverIds.has(id)) {
        const p = this.players.get(id);
        this.scene.remove(p.group);
        cleanupPlayerResources(p.group);
        this.players.delete(id);
      }
    }
  }

  updateAll() {
    for (const [, p] of this.players) {
      p.group.position.lerp(p.targetPos, LERP_FACTOR);

      const currentRotY = p.group.rotation.y;
      let diff = p.targetRotY - currentRotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.group.rotation.y += diff * LERP_FACTOR;
    }
  }
}
