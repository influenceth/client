import { minDeltaVSolver } from './lambertSolver';

const G = 6.6743015e-11; // N m2 / kg2
const m = 1.7033730830877265e30; // kg  // TODO: mass of adalia (and probably gravitational constant should be in sdk)
const Gm = G * m;

const v3ToArray = (v3) => ([
  v3.x || v3[0],
  v3.y || v3[1],
  v3.z || v3[2],
]);

async function porkchop({ originPath, destinationPath, minDelay, maxDelay, minTof, maxTof, resolution = 1 }) {
  const lamberts = [];
  for (let delay = minDelay; delay <= maxDelay; delay += resolution) {
    const originPosition = originPath.positions[delay];
    const originVelocity = originPath.velocities[delay];
    for (let tof = minTof; tof <= maxTof; tof += resolution) {
      const destinationPosition = destinationPath.positions[delay + tof];
      const destinationVelocity = destinationPath.velocities[delay + tof];
      if (originVelocity && destinationVelocity) {
        const { deltaV } = await minDeltaVSolver(
          Gm,
          v3ToArray(originPosition),
          v3ToArray(destinationPosition),
          tof * 86400,  // tof is in days
          v3ToArray(originVelocity),
          v3ToArray(destinationVelocity),
        );
        lamberts.push(deltaV);
      }
    }
  }
  return new Float32Array(lamberts);
}

export default porkchop;