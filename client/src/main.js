import { initScene, renderer, camera, scene } from "./world/scene.js";
import { initPhysics } from "./world/physics.js";
import { createFloor } from "./world/floor.js";
import { LocalPlayer } from "./player/localPlayer.js";
import { RemotePlayerManager } from "./player/remotePlayer.js";
import { initSocket } from "./network/socket.js";
import { initJoystick, getJoystickInput } from "./ui/joystick.js";

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

let localPlayer = null;
let remotePlayerManager = null;
let physicsWorld = null;
let started = false;
let starting = false;
let lastTime = 0;
let accumulator = 0;
const fixedDelta = 1 / 60;
const maxFrameDelta = 0.25;

async function start() {
  if (started || starting) return;
  starting = true;
  const overlay = document.getElementById("overlay");

  try {
    initScene(document.getElementById("canvas-container"));

    physicsWorld = await initPhysics();

    createFloor(scene, physicsWorld);

    localPlayer = new LocalPlayer(scene, physicsWorld, camera, isMobile);
    remotePlayerManager = new RemotePlayerManager(scene);

    initSocket({
      onPlayers: (data) => remotePlayerManager.update(data, localPlayer.userId),
      onInit: (userId) => { localPlayer.userId = userId; },
      getPosition: () => localPlayer.getPosition(),
      getRotationY: () => localPlayer.getRotationY(),
    });

    if (isMobile) {
      initJoystick();
      document.getElementById("joystick-zone").style.display = "block";
      document.getElementById("jump-btn").style.display = "flex";
      document.getElementById("camera-area").style.display = "block";
      document.getElementById("hud").style.display = "none";
    }

    overlay.style.display = "none";
    lastTime = 0;
    accumulator = 0;
    animate();
    started = true;
  } catch (error) {
    overlay.style.display = "flex";
    console.error("Failed to start metaverse:", error);
  } finally {
    starting = false;
  }
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  if (!lastTime) {
    lastTime = now;
  }

  const frameDelta = Math.min((now - lastTime) / 1000, maxFrameDelta);
  lastTime = now;
  accumulator += frameDelta;

  physicsWorld.timestep = fixedDelta;
  while (accumulator >= fixedDelta) {
    physicsWorld.step();
    accumulator -= fixedDelta;
  }

  const input = isMobile ? getJoystickInput() : localPlayer.getKeyboardInput();

  localPlayer.update(input);

  remotePlayerManager.updateAll();

  renderer.render(scene, camera);
}

document.getElementById("enter-btn").addEventListener("click", () => {
  if (isMobile) {
    requestDeviceOrientationPermission().then(start);
  } else {
    start();
  }
});

async function requestDeviceOrientationPermission() {
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch {
      // permission denied or not supported
    }
  }
}
