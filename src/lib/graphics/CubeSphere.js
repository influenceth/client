import { BoxGeometry, BufferAttribute, Vector3 } from 'three';

class CubeSphere extends BoxGeometry {
  constructor(length, div) {
    super(length, length, length, div, div, div);
  }

  computeVertexNormals() {
    const attributes = this.attributes;
    const groups = this.groups;
    const collapsed = this._getCollapsedPositions();

    if (attributes.position) {
      const positions = attributes.position.array;

      if (attributes.normal === undefined) {
        this.setAttribute('normal', new BufferAttribute(new Float32Array(positions.length), 3));
      } else {
        // reset existing normals to zero
        const array = attributes.normal.array;

        for (let i = 0; i < array.length; i ++) {
          array[i] = 0;
        }
      }

      const normals = attributes.normal.array;
      let vA, vB, vC, keyA, keyB, keyC;
      const pA = new Vector3();
      const pB = new Vector3();
      const pC = new Vector3();
      const cb = new Vector3();
      const ab = new Vector3();
      const indices = this.index.array;

      if (groups.length === 0) {
        this.addGroup(0, indices.length);
      }

      for (let j = 0; j < groups.length; ++ j) {
        const start = groups[j].start;
        const count = groups[j].count;

        for (let i = start, il = start + count; i < il; i += 3) {
          vA = indices[i + 0] * 3;
          vB = indices[i + 1] * 3;
          vC = indices[i + 2] * 3;

          pA.fromArray(positions, vA);
          pB.fromArray(positions, vB);
          pC.fromArray(positions, vC);

          cb.subVectors(pC, pB);
          ab.subVectors(pA, pB);
          cb.cross(ab);

          keyA = this._generatePositionKey(...pA.toArray());
          keyB = this._generatePositionKey(...pB.toArray());
          keyC = this._generatePositionKey(...pC.toArray());

          collapsed[keyA].forEach(pi => {
            normals[pi * 3] += cb.x;
            normals[pi * 3 + 1] += cb.y;
            normals[pi * 3 + 2] += cb.z;
          });

          collapsed[keyB].forEach(pi => {
            normals[pi * 3] += cb.x;
            normals[pi * 3 + 1] += cb.y;
            normals[pi * 3 + 2] += cb.z;
          });

          collapsed[keyC].forEach(pi => {
            normals[pi * 3] += cb.x;
            normals[pi * 3 + 1] += cb.y;
            normals[pi * 3 + 2] += cb.z;
          });
        }
      }

      this.normalizeNormals();
      attributes.normal.needsUpdate = true;
    }
  }

  /**
   * Displaces the cube sphere based on a height map, the target radius, and a config
   * @param map Array of 6 height maps that map to the cube faces
   * @param radius The target radius in meters of the sphere
   * @param config An object that may define a dispWeight and stretch
   */
  displaceWithHeightMap(maps, radius, config = { dispWeight: 1, stretch: 1 }) {
    let map, tWidth, tHeight, start, count;
    const vertices = this.attributes.position;
    const uvs = this.attributes.uv.array;
    const touched = new Set();
    const sides = [0, 1, 3, 2, 4, 5]; // required for the flipY option on texture

    for (let i = 0; i < 6; i++) {
      let vi;
      map = maps[sides[i]];
      tWidth = map.width;
      tHeight = map.height;
      start = this.groups[i].start;
      count = this.groups[i].count;

      for (let j = start; j < start + count; j++) {
        vi = this.index.array[j]; // vertexindex
        if (touched.has(vi)) continue;
        const v = new Vector3().fromArray(vertices.array, vi * 3);
        const s = Math.round(uvs[vi * 2] * (tWidth - 1));       // u
        const t = Math.round(uvs[vi * 2 + 1] * (tHeight - 1));  // v
        const mod = -1 + map.buffer[(tWidth * t + s) * 4 + 3] / 128;
        v.setLength(radius * (1 + mod * config.dispWeight)).multiply(config.stretch);
        vertices.setXYZ(vi, v.x, v.y, v.z);
        touched.add(vi);
      }
    }

    vertices.needsUpdate = true;
    this.computeVertexNormals();
  }

  _generatePositionKey(x, y, z) {
    const precisionPoints = 4; // number of decimal points, e.g. 4 for epsilon of 0.0001
    const precision = Math.pow(10, precisionPoints);
    const p = [x, y, z];
    return p.map(v => Math.round(v * precision)).join('|');
  }

  _getCollapsedPositions() {
    const positions = this.attributes.position;
    const positionMap = {};

    for (let i = 0; i < positions.count; i++) {
      const p = positions.array.slice(i * 3, i * 3 + 3);
      const key =  this._generatePositionKey(...p);
      positionMap[key] ? positionMap[key].push(i) : positionMap[key] = [i];
    }

    return positionMap;
  }
}

export default CubeSphere;
