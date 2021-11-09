import { Raycaster, Vector3 } from 'three';

const phi = Math.PI * (3 - Math.sqrt(5));

export const unitFiboPoint = (index, samples) => {
  const y = 1 - (index / (samples - 1)) * 2; // y goes from 1 to -1
  const radius = Math.sqrt(1 - y * y); // radius at y
  const theta = phi * index; // golden angle increment

  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  return [x, y, z];
};

export const unitFiboSphere = (samples) => {
  const geometry = [];
  for (let index = 0; index < samples; index++) {
    geometry.push(unitFiboPoint(index, samples));
  }
  return geometry;
}

/* NOTE: the lot highlighter calculates the fibo positions post-distortion
          but these functions calculate them pre-distortion, so they do not
          match up... using raycaster method instead (via surfaceFiboPoint)
export const unitFiboCubeSphere = (samples, outputAsVector3Buffer) => {
  const faceIndexes = { px: 0, nx: 1, py: 2, ny: 3, pz: 4, nz: 5 };
  const faces = [[],[],[],[],[],[]];

  for (let index = 0; index < samples; index++) {
    const [x, y, z] = unitFiboPoint(index, samples);

    const xAbs = Math.abs(x);
    const yAbs = Math.abs(y);
    const zAbs = Math.abs(z);
    let faceIndex, u, v;
    if (xAbs > yAbs && xAbs > zAbs) {
      faceIndex = faceIndexes[x > 0 ? 'px' : 'nx'];
      u = ((x > 0 ? -1 : 1) * z / xAbs + 1) / 2;
      v = (y / xAbs + 1) / 2;
    } else if (yAbs > xAbs && yAbs > zAbs) {
      faceIndex = faceIndexes[y > 0 ? 'py' : 'ny'];
      u = (x / yAbs + 1) / 2;
      v = ((y > 0 ? -1 : 1) * z / yAbs + 1) / 2;
    } else {
      faceIndex = faceIndexes[z > 0 ? 'pz' : 'nz'];
      u = ((z > 0 ? 1 : -1) * x / zAbs + 1) / 2;
      v = (y / zAbs + 1) / 2;
    }
    if (outputAsVector3Buffer) {
      faces[faceIndex].push(u);
      faces[faceIndex].push(v);
      faces[faceIndex].push(0);
    } else {
      faces[faceIndex].push(new Vector3(u, v, index));
    }
  }

  return faces;
};

export const heightMapFiboPoint = (index, samples, maps, config, scale = 1.0) => {
  const v = (new Vector3()).fromArray(unitFiboPoint(index, samples));
  
  const xAbs = Math.abs(v.x);
  const yAbs = Math.abs(v.y);
  const zAbs = Math.abs(v.z);
  if (xAbs > yAbs && xAbs > zAbs) {
    const pos = v.x > 0;
    displaceVectorWithHeightMap(
      v,
      ((pos ? -1 : 1) * v.z / xAbs + 1) / 2,
      (v.y / xAbs + 1) / 2,
      maps[pos ? 0 : 1],
      config,
      scale
    );
    
  } else if (yAbs > xAbs && yAbs > zAbs) {
    const pos = v.y > 0;
    displaceVectorWithHeightMap(
      v,
      (v.x / yAbs + 1) / 2,
      ((pos ? -1 : 1) * v.z / yAbs + 1) / 2,
      maps[pos ? 3 : 2],
      config,
      scale
    );
  } else if (true) {
    const pos = v.z > 0;
    displaceVectorWithHeightMap(
      v,
      ((pos ? 1 : -1) * v.x / zAbs + 1) / 2,
      (v.y / zAbs + 1) / 2,
      maps[pos ? 4 : 5],
      config,
      scale
    );
  }

  return v;
};

export const heightMapFiboSphere = (samples, maps, config) => {
  const geometry = [];
  for (let index = 0; index < samples; index++) {
    geometry.push(heightMapFiboPoint(index, samples, maps, config));
  }
  return geometry;
};
*/

// TODO: if all of these are going to be calculated before initial render, then can place them
//  before rotation (and just leave those parts out)
const raycaster = new Raycaster();
export const surfaceFiboPoint = (index, samples, surface, radius, rotation = null, rotationAxis = null) => {
  const fiboUV = new Vector3(...unitFiboPoint(index, samples));
  if (rotation && rotationAxis) {
    fiboUV.applyAxisAngle(rotationAxis, rotation);
  }

  raycaster.set(
    fiboUV.clone().multiplyScalar(3.0 * radius),
    fiboUV.clone().negate()
  );
  const intersections = raycaster.intersectObject(surface, true);
  if (intersections.length > 0) {
    const intersect = intersections[0].point.clone();
    if (rotation && rotationAxis) {
      intersect.applyAxisAngle(rotationAxis, -rotation);
    }
    return intersect;
  }
  return null;
};

export const getNearbyFiboPoints = (center, samples, maxToReturn) => {
  const returnAllPoints = !maxToReturn;

  let arcToSearch, yToSearch, maxIndex, minIndex, centerTheta, thetaTolerance;
  if (returnAllPoints) {
    minIndex = 0;
    maxIndex = samples;
  } else {
    // assuming # of lots returning represent a circular area around center,
    // the radius of which is ~the arc length we need to search
    //    SA of unit sphere (4 * pi * r^2) == 4 * pi
    //    lotArea is SA / samples == 4 * pi / samples
    //    targetArea is pi * search_radius^2 == maxToReturn * lotArea
    //      search_radius = sqrt(maxToReturn * (4 * pi / samples) / pi)
    // + 10% safety factor
    arcToSearch = 1.1 * Math.sqrt(4 * maxToReturn / samples);
  
    // angle of arclen == arclen / radius (radius is 1)
    // y of angle == sin(angle) * radius (radius is 1)
    yToSearch = Math.sin(arcToSearch);
    maxIndex = Math.min(samples - 1, Math.ceil((1 - center.y + yToSearch) * (samples - 1) / 2));
    minIndex = Math.max(0, Math.floor((1 - center.y - yToSearch) * (samples - 1) / 2));
  
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

    const y = 1 - (2 * index / (samples - 1));
    const radiusAtY = Math.sqrt(1 - y * y);
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push([
      x,
      y,
      z,
      index,
      Math.abs(center.x - x) + Math.abs(center.y - y) + Math.abs(center.z - z),
    ]);
  }
  //console.log(`${maxIndex - minIndex} points in range; ${points.length} checked`);

  const sortedPoints = points
    .sort((a, b) => a[4] < b[4] ? -1 : 1)
    .slice(0, maxToReturn || undefined);

  return {
    closestIndex: sortedPoints[0][3],
    points: sortedPoints.map((p) => new Vector3(p[0], p[1], p[2]))
  };
};

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

/* NOTE: see notes on unitFiboCubeSphere above
export const displaceVectorWithHeightMap = (original, u, v, map, config, scale = 1.0) => {
  const tWidth = map.width;
  const tHeight = map.height;
  const s = Math.round(u * (tWidth - 1));
  const t = Math.round(v * (tHeight - 1));
  const mod = -1 + map.buffer[(tWidth * t + s) * 4 + 3] / 128;
  original.setLength(config.radius * (1 + mod * config.dispWeight)).multiply(config.stretch).multiplyScalar(scale);
  return [original.x, original.y, original.z];
};
*/

export const getAngleDiff = (angle1, angle2) => {
  const a1 = angle1 >= 0 ? angle1 : (angle1 + 2 * Math.PI);
  const a2 = angle2 >= 0 ? angle2 : (angle2 + 2 * Math.PI);
  const diff = Math.abs(a1 - a2) % (2 * Math.PI);
  return diff > Math.PI ? (2 * Math.PI - diff) : diff;
}
