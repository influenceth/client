import {
  FrontSide,
  Group,
  LessDepth,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
  VertexColors
} from 'three';
import QuadtreePlane from './helpers/QuadtreePlane';
import TerrainChunkManager from './helpers/TerrainChunkManagerThreaded';
// import TerrainChunkManager from './helpers/TerrainChunkManager';

const dictIntersection = function(dictA, dictB) {
  const intersection = {};
  for (let k in dictB) {
    if (k in dictA) {
      intersection[k] = dictA[k];
    }
  }
  return intersection
};

const dictDifference = function(dictA, dictB) {
  const diff = {...dictA};
  for (let k in dictB) {
    delete diff[k];
  }
  return diff;
};

const cubeTransforms = [
  (new Matrix4()).makeRotationX(-Math.PI / 2), // +Y
  (new Matrix4()).makeRotationX(Math.PI / 2),  // -Y
  (new Matrix4()).makeRotationY(Math.PI / 2),  // +X
  (new Matrix4()).makeRotationY(-Math.PI / 2), // -X
  new Matrix4(),                               // +Z
  (new Matrix4()).makeRotationY(Math.PI),      // -Z
];
const cubeTranslations = [
  (m, radius) => m.premultiply(new Matrix4().makeTranslation(0, radius, 0)),  // +Y
  (m, radius) => m.premultiply(new Matrix4().makeTranslation(0, -radius, 0)), // -Y
  (m, radius) => m.premultiply(new Matrix4().makeTranslation(radius, 0, 0)),  // +X
  (m, radius) => m.premultiply(new Matrix4().makeTranslation(-radius, 0, 0)), // -X
  (m, radius) => m.premultiply(new Matrix4().makeTranslation(0, 0, radius)),  // +Z
  (m, radius) => m.premultiply(new Matrix4().makeTranslation(0, 0, -radius)), // -Z
];

export const MIN_CHUNK_SIZE = 400; // TODO: resolution

class QuadtreeCubeSphere {
  constructor({ radius, stretch }) {
    this.sides = [];

    for (let i in cubeTransforms) {
      this.sides.push({
        transform: cubeTransforms[i].clone(),
        quadtree: new QuadtreePlane({
          size: radius,
          minChunkSize: MIN_CHUNK_SIZE,
          localToWorld: cubeTranslations[i](cubeTransforms[i].clone(), radius),
          worldStretch: stretch
        }),
      });
    }
  }

  setCameraPosition(position) {
    for (let s of this.sides) {
      s.quadtree.setCameraPosition(position);
    }
  }

  getSides() {
    return this.sides.map((s) => ({
      transform: s.transform,
      children: s.quadtree.getChildren()
    }));
  }
}

class QuadtreeCubeSphereManager {
  constructor(config, workerPool) {
    this.radius = config.radius;

    this.quadtreeCube = new QuadtreeCubeSphere({
      radius: config.radius,
      stretch: config.stretch
    });
    this.material = new MeshStandardMaterial({
      color: 0xFFFFFF,
      depthFunc: LessDepth,
      dithering: true,
      metalness: 0,
      roughness: 1,
      side: FrontSide,
      vertexColors: VertexColors,
      // wireframe: true,
    });

    this.builder = new TerrainChunkManager(config, workerPool);
    this.groups = [...new Array(6)].map(_ => new Group());
    this.chunks = {};
  }

  dispose() {
    Object.values(this.chunks).forEach(({ chunk }) => chunk.dispose());
    this.material.dispose();
  }

  setCameraPosition(cameraPosition) {
    this.quadtreeCube.setCameraPosition(cameraPosition);

    const sides = this.quadtreeCube.getSides();

    let updatedChunks = {};
    const center = new Vector3();
    const dimensions = new Vector3();
    for (let i = 0; i < sides.length; i++) {
      this.groups[i].matrix = sides[i].transform;
      this.groups[i].matrixAutoUpdate = false;
      for (let node of sides[i].children) {
        node.bounds.getCenter(center);
        node.bounds.getSize(dimensions);

        const child = {
          index: i,
          group: this.groups[i],
          position: [center.x, center.y, center.z],
          bounds: node.bounds,
          size: dimensions.x,
        };
        const key = `${child.position[0]}/${child.position[1]} [${child.size}] [${child.index}]`;
        updatedChunks[key] = child;
      }
    }

    const intersection = dictIntersection(this.chunks, updatedChunks);
    const difference = dictDifference(updatedChunks, this.chunks);
    const recycle = Object.values(dictDifference(this.chunks, updatedChunks));

    // recycle recently deprecated chunks
    this.builder.queueForRecycling(recycle);

    // re-init updatedChunks to those that already exist
    updatedChunks = intersection;

    // then create any new ones needed
    for (let k in difference) {
      const [xp, yp, zp] = difference[k].position;

      const offset = new Vector3(xp, yp, zp);
      updatedChunks[k] = {
        position: [xp, zp],
        chunk: this.createChunk(
          difference[k].index,
          difference[k].group,
          offset,
          difference[k].size,
          64 // TODO: resolution
        ),
      };
    }

    // update class
    this.chunks = updatedChunks;
  }

  removeRetiredChunks() {
    return this.builder.recycleOldChunks();
  }

  showCurrentChunks() {
    for (let k in this.chunks) {
      this.chunks[k].chunk.show();
    }
  }

  createChunk(side, group, offset, width, resolution) {
    return this.builder.allocateChunk({
      side,
      group: group,
      material: this.material,
      width: width,
      offset: offset,
      radius: this.radius,
      resolution: resolution,
    });
  }
}

export default QuadtreeCubeSphereManager;
