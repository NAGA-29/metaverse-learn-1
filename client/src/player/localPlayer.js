import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { createDynamicCapsuleBody, rapier } from "../world/physics.js";

const MOVE_SPEED = 5;
const JUMP_FORCE = 5;
const BODY_HEIGHT = 0.85;

const keys = {};

window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

export class LocalPlayer {
  constructor(scene, physicsWorld, camera, isMobile) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.camera = camera;
    this.isMobile = isMobile;
    this.userId = null;
    this._canJump = false;
    this._cameraEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this._sensorEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this._touchEuler = new THREE.Euler(0, 0, 0, "YXZ");
    this._isTouching = false;

    this._buildMesh();
    this._buildPhysics();

    if (!isMobile) {
      this._initPointerLock();
    } else {
      this._initDeviceOrientation();
      this._initTouchCamera();
    }
  }

  _buildMesh() {
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const bodyMat = new THREE.MeshLambertMaterial({
      color: 0x6699ff,
      transparent: true,
      opacity: 0.5,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);

    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.5,
    });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.15;

    this.avatarGroup = new THREE.Group();
    this.avatarGroup.add(this.bodyMesh);
    this.avatarGroup.add(this.headMesh);
    this.scene.add(this.avatarGroup);
  }

  _buildPhysics() {
    this.rigidBody = createDynamicCapsuleBody(this.physicsWorld, 0, 2, 0);
  }

  _initPointerLock() {
    this.controls = new PointerLockControls(this.camera, document.body);

    document.addEventListener("click", () => {
      if (document.getElementById("overlay").style.display === "none") {
        this.controls.lock();
      }
    });

    this.controls.addEventListener("lock", () => {
      document.getElementById("hud").style.display = "block";
    });
    this.controls.addEventListener("unlock", () => {
      document.getElementById("hud").style.display = "block";
    });
  }

  _initDeviceOrientation() {
    window.addEventListener("deviceorientation", (e) => {
      if (e.alpha == null) return;
      if (this._isTouching) return;
      const alpha = THREE.MathUtils.degToRad(e.alpha);
      const beta = THREE.MathUtils.degToRad(e.beta);
      const gamma = THREE.MathUtils.degToRad(e.gamma);

      this._sensorEuler.set(beta - Math.PI / 2, alpha, -gamma, "YXZ");
      this._applyMobileCameraOrientation();
    });
  }

  _initTouchCamera() {
    const area = document.getElementById("camera-area");
    let lastX = null;
    let lastY = null;

    area.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      lastX = t.clientX;
      lastY = t.clientY;
      this._isTouching = true;
    }, { passive: true });

    area.addEventListener("touchmove", (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      lastX = t.clientX;
      lastY = t.clientY;

      this._touchEuler.y -= dx * 0.003;
      this._touchEuler.x -= dy * 0.003;
      this._applyMobileCameraOrientation();
    }, { passive: true });

    area.addEventListener("touchend", () => {
      lastX = null;
      lastY = null;
      this._isTouching = false;
    }, { passive: true });

    document.getElementById("jump-btn").addEventListener("touchstart", (e) => {
      e.preventDefault();
      this._tryJump();
    });
  }

  getKeyboardInput() {
    const forward = (keys["KeyW"] || keys["ArrowUp"]) ? 1 : 0;
    const backward = (keys["KeyS"] || keys["ArrowDown"]) ? 1 : 0;
    const left = (keys["KeyA"] || keys["ArrowLeft"]) ? 1 : 0;
    const right = (keys["KeyD"] || keys["ArrowRight"]) ? 1 : 0;

    if (keys["Space"]) {
      this._tryJump();
      keys["Space"] = false;
    }

    return { forward: forward - backward, strafe: right - left };
  }

  _tryJump() {
    const pos = this.rigidBody.translation();
    const ray = new rapier.Ray(
      { x: pos.x, y: pos.y, z: pos.z },
      { x: 0, y: -1, z: 0 }
    );
    const hit = this.physicsWorld.castRay(
      ray,
      BODY_HEIGHT + 0.08,
      true,
      undefined,
      undefined,
      undefined,
      this.rigidBody
    );
    const isGrounded = hit != null;

    if (isGrounded) {
      this.rigidBody.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
    }
  }

  _applyMobileCameraOrientation() {
    if (!this.isMobile) return;
    const pitch = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this._sensorEuler.x + this._touchEuler.x)
    );
    const yaw = this._sensorEuler.y + this._touchEuler.y;
    this._cameraEuler.set(pitch, yaw, this._sensorEuler.z, "YXZ");
    this.camera.quaternion.setFromEuler(this._cameraEuler);
  }

  update(input) {
    const { forward, strafe } = input;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(dir, forward * MOVE_SPEED);
    move.addScaledVector(right, strafe * MOVE_SPEED);

    const currentVel = this.rigidBody.linvel();
    this.rigidBody.setLinvel(
      { x: move.x, y: currentVel.y, z: move.z },
      true
    );

    const pos = this.rigidBody.translation();
    this.avatarGroup.position.set(pos.x, pos.y - BODY_HEIGHT, pos.z);

    const camY = pos.y + 0.2;
    if (!this.isMobile && this.controls) {
      this.camera.position.set(pos.x, camY, pos.z);
    } else {
      this.camera.position.set(pos.x, camY, pos.z);
    }
  }

  getPosition() {
    const pos = this.rigidBody.translation();
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  getRotationY() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return Math.atan2(dir.x, dir.z);
  }
}
