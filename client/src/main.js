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

async function start() {
  if (started) return;
  started = true;

  document.getElementById("overlay").style.display = "none";

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

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const input = isMobile ? getJoystickInput() : localPlayer.getKeyboardInput();

  physicsWorld.step();

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
