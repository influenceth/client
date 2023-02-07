import { Vector3 } from 'three';
import { Asteroid as AsteroidLib } from '@influenceth/sdk';
import { cubeTransforms, generateHeightMap, getSamplingResolution } from './TerrainChunkUtils';

const phi = Math.PI * (3 - Math.sqrt(5));
const twoPI = 2 * Math.PI;

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

export const getPlotPointGeometry = (lotId, pointTally, resolution, heightMaps, config, aboveSurface) => {
  const fibo = (new Vector3()).fromArray(AsteroidLib.getLotPosition(0, lotId, pointTally));

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
  const sampledPosition = (new Vector3()).addVectors(
    s0t.multiplyScalar(s0Weight),
    s1t.multiplyScalar(s1Weight)
  );
  const position = fibo.clone().multiply(config.stretch).setLength(sampledPosition.length()+ aboveSurface);

  // trying to avoid seeing plots through ridges...
  // for small asteroids, seems best to always use radial orientation because plots are far enough apart relative to displacement
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

export const getPlotGeometryHeightMapResolution = (config) => {
  return getSamplingResolution(config.radius, 250);
};

export const getPlotGeometryHeightMaps = (config) => {
  const heightMaps = [];
  const resolution = getPlotGeometryHeightMapResolution(config);
  for (let i = 0; i < 6; i++) {
    const sideTransform = cubeTransforms[i].clone();
    heightMaps[i] = generateHeightMap(
      sideTransform,
      1,
      new Vector3(0, 0, 0),
      resolution,
      { N: 1, S: 1, E: 1, W: 1 },
      0,
      16,
      false,
      config,
      'texture',
    );
  }
  return heightMaps;
};

export const getPlotGeometry = ({ config, aboveSurface = 0.0, prebuiltHeightMaps }) => {
  const pointTally = Math.floor(4 * Math.PI * (config.radiusNominal / 1000) ** 2);
  const resolution = getPlotGeometryHeightMapResolution(config);
  const heightMaps = prebuiltHeightMaps || getPlotGeometryHeightMaps(config);

  const positions = new Float32Array(pointTally * 3);
  const orientations = new Float32Array(pointTally * 3);
  for (let index = 0; index < pointTally; index++) {
    const { position, orientation } = getPlotPointGeometry(
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

export const getPlotRegions = (positions, regionTally) => {
  // TODO: benchmark this against loop to check all (i.e. above, prepopulating region positions)
  // TODO: does this position need to be shifted per asteroid stretch / deformations?
  const batchSize = positions.length / 3;
  const regions = new Int16Array(batchSize);
  for (let i = 0; i < batchSize; i++) {
    const positionIndex = i * 3;
    const center = new Vector3(positions[positionIndex], positions[positionIndex + 1], positions[positionIndex + 2]).normalize();
    regions[i] = getClosestPlots({ center, plotTally: regionTally, findTally: 1 })[0];
    // if (i % 1000 === 0) console.log(`to ${i}`);
    if (regions[i] === undefined) regions[i] = -1;
  }
  return regions;
}

export const getAngleDiff = (angle1, angle2) => {
  const a1 = angle1 >= 0 ? angle1 : (angle1 + twoPI);
  const a2 = angle2 >= 0 ? angle2 : (angle2 + twoPI);
  const diff = Math.abs(a1 - a2) % twoPI;
  return diff > Math.PI ? (twoPI - diff) : diff;
}

export const getClosestPlots = ({ center, centerPlot, plotTally, findTally }) => {
  const returnAllPoints = !findTally; // if no findTally attached, return all (sorted)

  // if pass centerPlot instead of center, set center from centerPlot
  // NOTE: assume centerPlot is nominal plot id
  if (centerPlot && !center) {
    center = new Vector3(...AsteroidLib.getLotPosition(0, centerPlot, plotTally));
  }

  let arcToSearch, yToSearch, maxIndex, minIndex, centerTheta, thetaTolerance;
  if (returnAllPoints || plotTally < 100) {
    minIndex = 0;
    maxIndex = plotTally;
  } else {
    // assuming # of lots returning represent a circular area around center,
    // the radius of which is ~the arc length we need to search
    //    SA of unit sphere (4 * pi * r^2) == 4 * pi
    //    lotArea is SA / plotTally == 4 * pi / plotTally
    //    targetArea is pi * search_radius^2 == findTally * lotArea
    //      search_radius = sqrt(findTally * (4 * pi / plotTally) / pi)
    // + 10% safety factor
    arcToSearch = 1.1 * Math.sqrt(4 * findTally / plotTally);

    // angle of arclen == arclen / radius (radius is 1)
    // y of angle == sin(angle) * radius (radius is 1)
    yToSearch = Math.sin(arcToSearch);
    maxIndex = Math.min(plotTally, Math.ceil((1 - center.y + yToSearch) * (plotTally - 1) / 2));
    minIndex = Math.max(0, Math.floor((1 - center.y - yToSearch) * (plotTally - 1) / 2));

    centerTheta = Math.atan2(center.z, center.x);
    thetaTolerance = arcToSearch / Math.sqrt(1 - center.y * center.y);
  }

  const points = [];
  for(let index = minIndex; index < maxIndex; index++) {
    const theta = phi * index;
    if (!returnAllPoints) {
      if (getAngleDiff(centerTheta, theta) > thetaTolerance) {
        continue;
      }
    }

    const y = 1 - (2 * index / (plotTally - 1));
    const radiusAtY = Math.sqrt(1 - y * y);
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push([
      x,
      y,
      z,
      index + 1,  // nominalIndex
      Math.pow(center.x - x, 2) + Math.pow(center.y - y, 2) + Math.pow(center.z - z, 2),
    ]);
  }
  //console.log(`${maxIndex - minIndex} points in range; ${points.length} checked`);

  return points
    .sort((a, b) => a[4] < b[4] ? -1 : 1) // sort by distance
    .map((p) => p[3]) // map to plot index
    .slice(0, findTally || undefined); // slice to target number
}