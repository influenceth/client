import { Vector2, Vector3 } from 'three';

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
    // TODO: check that the orientation on these is correct (maybe by writing number or sizing up so we know spiral is contiguous OR checking from polar coordinates)
  }

  return faces;
};

export const fiboOnHeightMap = (samples, maps, config) => {
  const geometry = [];
  for (let index = 0; index < samples; index++) {
    const v = new Vector3().fromArray(unitFiboPoint(index, samples));

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
        config
      );
      
    } else if (yAbs > xAbs && yAbs > zAbs) {
      const pos = v.y > 0;
      displaceVectorWithHeightMap(
        v,
        (v.x / yAbs + 1) / 2,
        ((pos ? -1 : 1) * v.z / yAbs + 1) / 2,
        maps[pos ? 3 : 2],
        config
      );
    } else {
      const pos = v.z > 0;
      displaceVectorWithHeightMap(
        v,
        ((pos ? 1 : -1) * v.x / zAbs + 1) / 2,
        (v.y / zAbs + 1) / 2,
        maps[pos ? 4 : 5],
        config
      );
    }

    geometry.push(v);
    // TODO: check that the orientation on these is correct (maybe by writing number or sizing up so we know spiral is contiguous OR checking from polar coordinates)
  }

  return geometry;
};

// we know points should be ~1km apart, which means if we limit our checks to
// a range of +-0.5km in any dimension, we should feel confident we will get
// at least one point (NOTE: distribution isn't perfect, so worth a safety factor)
const poleBuffer = 0.85;  // TODO: poleBuffer should be proportional to lotSize instead of % of sphere
export const getNearbyFibPoints = (center, samples, radius, maxToReturn) => {
  const lotSize = 1000 / radius;
  const yRadiusToSearch = 2 * lotSize;

  let centerTheta = Math.atan2(center.z, center.x);
  
  // TODO: rather than poleBuffer, thetaTolerance should probably expand to 2*PI as approach pole
  //    and converge to minimum (that is inverse to samples) near equator
  const thetaTolerance = getThetaTolerance(samples);

  const maxIndex = Math.min(samples - 1, Math.ceil((1 - center.y + yRadiusToSearch) * (samples - 1) / 2));
  const minIndex = Math.max(0, Math.floor((1 - center.y - yRadiusToSearch) * (samples - 1) / 2));

  const points = [];
  for(let index = minIndex; index < maxIndex; index++) {
    const theta = phi * index;
    
    // skip if this point is not within a threshold of angle to center
    if (center.y < poleBuffer && center.y > -poleBuffer) {
      if (getAngleDiff(centerTheta, theta) > thetaTolerance) continue;
    }

    const y = 1 - (2 * index / (samples - 1));
    const radiusAtY = Math.sqrt(1 - y * y);
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push([
      x,
      y,
      z,
      Math.abs(center.x - x) + Math.abs(center.y - y) + Math.abs(center.z - z)
    ]);
  }
  console.log(`${maxIndex - minIndex} points in range; ${points.length} checked`);

  return points
    .sort((a, b) => a[3] < b[3] ? -1 : 1)
    .map((p) => new Vector3(p[0], p[1], p[2]))
    .slice(0, maxToReturn);
};

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

export const displaceVectorWithHeightMap = (original, u, v, map, config) => {
  const tWidth = map.width;
  const tHeight = map.height;
  const s = Math.round(u * (tWidth - 1));
  const t = Math.round(v * (tHeight - 1));
  const mod = -1 + map.buffer[(tWidth * t + s) * 4 + 3] / 128;
  original.setLength(config.radius * (1 + mod * config.dispWeight)).multiply(config.stretch);
  return [original.x, original.y, original.z];
};

export const getAngleDiff = (angle1, angle2) => {
  const a1 = angle1 >= 0 ? angle1 : (angle1 + 2 * Math.PI);
  const a2 = angle2 >= 0 ? angle2 : (angle2 + 2 * Math.PI);
  const diff = Math.abs(a1 - a2) % (2 * Math.PI);
  return diff > Math.PI ? (2 * Math.PI - diff) : diff;
}

// TODO: flesh this out
export const getThetaTolerance = (samples) => { 
  if (samples < 1e2) return 2 * Math.PI;
  if (samples < 1e3) return Math.PI / (Math.log10(samples) + 1);
  return Math.PI / (2 * Math.log10(samples));
}