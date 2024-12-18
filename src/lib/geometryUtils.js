import { AdalianOrbit } from '@influenceth/sdk';
import { Vector3 } from 'three';

export const getUpdatedAsteroidPositions = function(orbitals, elapsed = 0) {
  const positions = new Float32Array(orbitals.length * 3);

  orbitals.forEach((orbital, i) => {
    const coords = (new AdalianOrbit(orbital, { units: 'km' })).getPositionAtTime(elapsed);
    if (isNaN(coords.x)) console.log(i, orbital);
    positions[i * 3 + 0] = coords.x;
    positions[i * 3 + 1] = coords.y;
    positions[i * 3 + 2] = coords.z;
  });
  return positions;
};

export const getUpdatedPlanetPositions = function(orbitals, elapsed = 0) {
  const positions = new Float32Array(orbitals.length * 3);
  orbitals.forEach((orbital, i) => {
    const coords = (new AdalianOrbit(orbital, { units: 'km' })).getPositionAtTime(elapsed);
    positions[i * 3 + 0] = coords.x;
    positions[i * 3 + 1] = coords.y;
    positions[i * 3 + 2] = coords.z;
  });
  return positions;
};

// Return a point on the circle with center C, unit normal n and radius r
// that's closest to the point P. (If all points are closest, return any.)
// (adapted from https://stackoverflow.com/a/6573307)
export const pointCircleClosest = (_P, _C, _n, r, returnLocalCoords = false) => {
  const P = _P.clone();
  const C = _C.clone();
  const n = _n.clone().normalize();

  // Translate problem to C-centered coordinates.
  // P.sub(C);
  P.sub(C).normalize();

  // Project P onto the plane containing the circle.
  // (if Q is at the centre, all points on the circle are equally close)
  const qLength = n.dot(P);
  const Q = qLength === 0
    ? getPerpendicular(n)
    : P.clone().sub(n.clone().setLength(qLength));

  // Now the nearest point lies on the line through the origin and Q.
  // const R = P.clone().sub(Q.clone().setLength(r / Q.length()));
  const R = Q.clone().setLength(r / Q.length());
  R.setLength(r);

  // Return to original coordinate system
  return returnLocalCoords
    ? R
    : R.add(C);
}

// Return an arbitrary vector that's perpendicular to n.
const getPerpendicular = (n) => {
  if (Math.abs(n.y) < Math.abs(n.z)) {
    return n.clone().cross(new Vector3(1, 0, 0));
  }
  return n.clone().cross(new Vector3(0, 1, 0));
}

// TODO: should this go into sdk's AdalianOrbit?
export const sampleAsteroidOrbit = (baseTime, orbital, minOffset, maxOffset, increment) => {
  const positions = [];
  const velocities = [];
  const orbit = new AdalianOrbit(orbital, { units: 'km' });
  for (let delay = minOffset; delay < maxOffset + 1; delay += increment) {
    // to safely deal with floats
    const basePlusDelay = Math.round(100 * (baseTime + delay)) / 100;
    const delayMinusIncr = Math.round(100 * (delay - increment)) / 100;

    // set positions
    const p = orbit.getPositionAtTime(basePlusDelay)
    positions[delay] = new Vector3(p.x, p.y, p.z);

    // set velocity of previous based on this position
    if (positions[delayMinusIncr]) {
      velocities[delayMinusIncr] = (new Vector3()).subVectors(
        positions[delay],
        positions[delayMinusIncr]
      );
      velocities[delayMinusIncr].divideScalar(increment * 86400);
    }
  }
  return { positions, velocities };
}

