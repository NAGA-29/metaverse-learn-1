import nipplejs from "nipplejs";

let joystickForward = 0;
let joystickStrafe = 0;

export function initJoystick() {
  const zone = document.getElementById("joystick-zone");

  const manager = nipplejs.create({
    zone,
    mode: "static",
    position: { left: "75px", bottom: "75px" },
    color: "rgba(79, 70, 229, 0.7)",
    size: 120,
  });

  manager.on("move", (_, data) => {
    if (!data.vector) return;
    const maxDist = 50;
    const dist = Math.min(data.distance, maxDist) / maxDist;
    joystickForward = -data.vector.y * dist;
    joystickStrafe = data.vector.x * dist;
  });

  manager.on("end", () => {
    joystickForward = 0;
    joystickStrafe = 0;
  });
}

export function getJoystickInput() {
  return { forward: joystickForward, strafe: joystickStrafe };
}
