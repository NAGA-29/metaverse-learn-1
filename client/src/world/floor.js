import * as THREE from "three";
import { createFixedBody } from "./physics.js";

const FLOOR_SIZE = 50;
const WALL_HEIGHT = 5;
const WALL_THICKNESS = 0.5;

function makeGridTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0d1030";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#2a3580";
  ctx.lineWidth = 1;
  const step = size / 10;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

export function createFloor(scene, physicsWorld) {
  const tex = makeGridTexture();

  const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const floorMat = new THREE.MeshLambertMaterial({ map: tex });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  createFixedBody(physicsWorld, 0, -0.1, 0, FLOOR_SIZE / 2, 0.1, FLOOR_SIZE / 2);

  const wallMat = new THREE.MeshLambertMaterial({
    color: 0x1a2060,
    transparent: true,
    opacity: 0.6,
  });

  const half = FLOOR_SIZE / 2;
  const wallDefs = [
    { x: 0,    y: WALL_HEIGHT / 2, z: -half, rx: FLOOR_SIZE / 2, ry: WALL_HEIGHT / 2, rz: WALL_THICKNESS / 2, w: FLOOR_SIZE, h: WALL_HEIGHT },
    { x: 0,    y: WALL_HEIGHT / 2, z:  half, rx: FLOOR_SIZE / 2, ry: WALL_HEIGHT / 2, rz: WALL_THICKNESS / 2, w: FLOOR_SIZE, h: WALL_HEIGHT },
    { x: -half, y: WALL_HEIGHT / 2, z: 0,   rx: WALL_THICKNESS / 2, ry: WALL_HEIGHT / 2, rz: FLOOR_SIZE / 2, w: FLOOR_SIZE, h: WALL_HEIGHT, rotY: true },
    { x:  half, y: WALL_HEIGHT / 2, z: 0,   rx: WALL_THICKNESS / 2, ry: WALL_HEIGHT / 2, rz: FLOOR_SIZE / 2, w: FLOOR_SIZE, h: WALL_HEIGHT, rotY: true },
  ];

  for (const d of wallDefs) {
    const geo = new THREE.BoxGeometry(
      d.rotY ? WALL_THICKNESS : FLOOR_SIZE,
      WALL_HEIGHT,
      d.rotY ? FLOOR_SIZE : WALL_THICKNESS
    );
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(d.x, d.y, d.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    createFixedBody(physicsWorld, d.x, d.y, d.z, d.rx, d.ry, d.rz);
  }
}
