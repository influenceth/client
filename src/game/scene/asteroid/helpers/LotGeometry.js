import { Vector3 } from 'three';
import { Asteroid } from '@influenceth/sdk';
import { cubeTransforms, generateHeightMap, getSamplingResolution } from './TerrainChunkUtils';

const getSamplePoint = (side, resolution, s, t) => {
  let x, y, z;
  const u = s / (resolution - 1);
  const v = t / (resolution - 1);
  switch(side) {
    default:
    case 0:
      x = 2 * u - 1;
      y = 1;
      z = 1 - 2 * v;
      break;
    case 1:
      x = 2 * u - 1;
      y = -1;
      z = 2 * v - 1;
      break;
    case 2:
      x = 1;
      y = 2 * v - 1;
      z = 1 - 2 * u;
      break;
    case 3:
      x = -1;
      y = 2 * v - 1;
      z = 2 * u - 1;
      break;
    case 4:
      x = 2 * u - 1;
      y = 2 * v - 1;
      z = 1;
      break;
    case 5:
      x = 1 - 2 * u;
      y = 2 * v - 1;
      z = -1;
      break;
  }
  return new Vector3(x, y, z);
};

const getSamplePosition = (side, s, t, heightMap, config, resolution) => {
  const bufferIndex = (resolution * (resolution - t - 1) + s) * 4;  // (flip y)
  const heightSample = -1 + (heightMap.buffer[bufferIndex] + heightMap.buffer[bufferIndex + 1] / 255) / 127.5;
  const displacement = config.radius * (1 + heightSample * config.dispWeight);
  return getSamplePoint(side, resolution, s, t).setLength(displacement).multiply(config.stretch);
}

export const getLotPointGeometry = (lotIndex, pointTally, resolution, heightMaps, config, aboveSurface) => {
  const fibo = (new Vector3()).fromArray(Asteroid.getLotPosition(0, lotIndex, pointTally));

  const xAbs = Math.abs(fibo.x);
  const yAbs = Math.abs(fibo.y);
  const zAbs = Math.abs(fibo.z);

  let side, u, v;
  if (xAbs > yAbs && xAbs > zAbs) {
    const isPositive = fibo.x > 0;
    side = isPositive ? 2 : 3;
    u = ((isPositive ? -1 : 1) * fibo.z / xAbs + 1) / 2;
    v = (fibo.y / xAbs + 1) / 2;
  } else if (yAbs > xAbs && yAbs > zAbs) {
    const isPositive = fibo.y > 0;
    side = isPositive ? 0 : 1;
    u = (fibo.x / yAbs + 1) / 2;
    v = ((isPositive ? -1 : 1) * fibo.z / yAbs + 1) / 2;
  } else {
    const isPositive = fibo.z > 0;
    side = isPositive ? 4 : 5;
    u = ((isPositive ? 1 : -1) * fibo.x / zAbs + 1) / 2;
    v = (fibo.y / zAbs + 1) / 2;
  }

  const s = u * (resolution - 1);
  const t = v * (resolution - 1);
  const sRange = Math.ceil(s) - Math.floor(s);
  const tRange = Math.ceil(t) - Math.floor(t);
  const s1Weight = (s - Math.floor(s)) / sRange;
  const t1Weight = (s - Math.floor(s)) / tRange;
  const s0Weight = 1 - s1Weight;
  const t0Weight = 1 - t1Weight;
  const s0t0 = getSamplePosition(side, Math.floor(s), Math.floor(t), heightMaps[side], config, resolution);
  const s0t1 = getSamplePosition(side, Math.floor(s), Math.ceil(t), heightMaps[side], config, resolution);
  const s1t0 = getSamplePosition(side, Math.ceil(s), Math.floor(t), heightMaps[side], config, resolution);
  const s1t1 = getSamplePosition(side, Math.ceil(s), Math.ceil(t), heightMaps[side], config, resolution);

  // weighted calculation of position
  const s0t = (new Vector3()).addVectors(
    s0t0.clone().multiplyScalar(t0Weight),
    s0t1.clone().multiplyScalar(t1Weight)
  );
  const s1t = (new Vector3()).addVectors(
    s1t0.clone().multiplyScalar(t0Weight),
    s1t1.clone().multiplyScalar(t1Weight)
  );
  // in theory, this should be an accurate representation of final position, but
  // for whatever reason, we lose enough precision in the weighted averaging to
  // end up with some stair-steppy artifacts on the surface... so, when setting final
  // position, we just apply the sampled length to the stretched (initial) fibo position
  // TODO: may be worth troubleshooting why this is happening b/c it shouldn't be, and
  //  it is possible that we are just masking the fact that our weighted sampling is not
  //  calculating the correct length accurately either
  const sampledPosition = (new Vector3()).addVectors(
    s0t.multiplyScalar(s0Weight),
    s1t.multiplyScalar(s1Weight)
  );
  // TODO: should this technically stretch after length setting? maybe not since samples were already stretched
  const position = fibo.clone().multiply(config.stretch).setLength(sampledPosition.length() + aboveSurface);

  // trying to avoid seeing lots through ridges...
  // for small asteroids, seems best to always use radial orientation because lots are far enough apart relative to displacement
  // for medium+ asteroids, seems like it helps to take surface orientation into account somewhat
  // this "averages" radial direction and surface normal direction
  const orientation = (new Vector3());
  if (config.radiusNominal > 7500) {
    // NOTE: normal to surface is cross product of two perpendicular vectors along surface
    orientation.crossVectors(
      s1t0.clone().sub(s0t0),
      s0t1.clone().sub(s0t0),
    );
    orientation
      .normalize()
      .add(position)
      .add(position.clone().normalize()); // if this were length 0, would be oriented to surface
  } else {      // orient to position (i.e. radially)
    orientation.copy(position).multiplyScalar(2);
  }

  return {
    position,
    orientation
  };
};

export const getLotGeometryHeightMapResolution = (config, textureQuality) => {
  // textureQuality 1, 2, 3 --> sampling every 1000, 500, 250m
  let sampleEvery = 1000;
  if (textureQuality === 2) sampleEvery = 500;
  if (textureQuality === 3) sampleEvery = 250;
  return getSamplingResolution(config.radius, sampleEvery);
};

export const getLotGeometryHeightMaps = (config, resolution) => {
  const heightMaps = [];
  for (let i = 0; i < 6; i++) {
    const sideTransform = cubeTransforms[i].clone();
    heightMaps[i] = generateHeightMap(
      sideTransform,
      1,
      new Vector3(0, 0, 0),
      resolution,
      { N: 1, S: 1, E: 1, W: 1 },
      false,
      config,
      'texture',
    );
  }
  return heightMaps;
};

export const getLotGeometry = ({ config, aboveSurface = 0.0, prebuiltHeightMaps, textureQuality }) => {
  const pointTally = Asteroid.getSurfaceArea(null, config.radiusNominal / 1000);
  const resolution = getLotGeometryHeightMapResolution(config, textureQuality);
  const heightMaps = prebuiltHeightMaps || getLotGeometryHeightMaps(config, resolution);

  const positions = new Float32Array(pointTally * 3);
  const orientations = new Float32Array(pointTally * 3);
  for (let index = 0; index < pointTally; index++) {
    const { position, orientation } = getLotPointGeometry(
      index + 1, pointTally, resolution, heightMaps, config, aboveSurface
    );

    positions[3 * index + 0] = position.x;
    positions[3 * index + 1] = position.y;
    positions[3 * index + 2] = position.z;

    orientations[3 * index + 0] = orientation.x;
    orientations[3 * index + 1] = orientation.y;
    orientations[3 * index + 2] = orientation.z;
  }

  return { positions, orientations };
}

export const getLotRegions = (positions, regionTally) => {
  return Asteroid.getRegionsOfLotPositions(positions, regionTally);
}

export const getClosestLots = ({ center, centerLot, lotTally, findTally }) => {
  return Asteroid.getClosestLots({
    center: center ? [center.x, center.y, center.z] : undefined,
    centerLot: centerLot,
    lotTally: lotTally,
    findTally
  });
}