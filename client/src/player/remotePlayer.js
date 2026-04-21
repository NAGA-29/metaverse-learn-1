import * as THREE from "three";

const LERP_FACTOR = 0.18;

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

export class RemotePlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map();
  }

  update(serverData, localUserId) {
    const serverIds = new Set(Object.keys(serverData));

    for (const [id, info] of Object.entries(serverData)) {
      if (id === localUserId) continue;

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
