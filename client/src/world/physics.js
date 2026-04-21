import RAPIER from "@dimforge/rapier3d-compat";

export let rapier;

export async function initPhysics() {
  await RAPIER.init();
  rapier = RAPIER;

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  return world;
}

export function createFixedBody(world, x, y, z, hw, hh, hd) {
  const bodyDesc = rapier.RigidBodyDesc.fixed().setTranslation(x, y, z);
  const body = world.createRigidBody(bodyDesc);
  const colliderDesc = rapier.ColliderDesc.cuboid(hw, hh, hd);
  world.createCollider(colliderDesc, body);
  return body;
}

export function createDynamicCapsuleBody(world, x, y, z) {
  const bodyDesc = rapier.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z)
    .lockRotations()
    .setLinearDamping(4.0);
  const body = world.createRigidBody(bodyDesc);
  const colliderDesc = rapier.ColliderDesc.capsule(0.5, 0.35)
    .setFriction(0.0)
    .setRestitution(0.0);
  world.createCollider(colliderDesc, body);
  return body;
}
