import { Box3, Vector3 } from 'three';
import constants from '~/lib/constants';

const {
  MIN_CHUNK_SIZE,
  CHUNK_SPLIT_DISTANCE
} = constants;


// // (generation function for edgeToEdgeMap)
// const sideNeighbors = [
//   [5,4,2,3],
//   [4,5,2,3],
//   [0,1,5,4],
//   [0,1,4,5],
//   [0,1,2,3],
//   [0,1,3,2],
// ];
// const edgeToEdgeMap = [];
// for (let i = 0; i < 6; i++) {
//   edgeToEdgeMap[i] = [];
//   for (let d = 0; d < 4; d++) {
//     const sideIndexOfMyNeighbor = sideNeighbors[i][d];
//     const directionFromNeighborToMe = sideNeighbors[sideIndexOfMyNeighbor].indexOf(i);
//     edgeToEdgeMap[i][d] = [
//       sideIndexOfMyNeighbor,
//       directions[directionFromNeighborToMe],
//       // flip bounds on some edges
//       (d === 0 && directionFromNeighborToMe === 0)    // N to N (sides 5 to 0, 0 to 5)
//       || (d === 0 && directionFromNeighborToMe === 3) // N to W (sides 3 to 0)
//       || (d === 1 && directionFromNeighborToMe === 1) // S to S (sides 5 to 1, 1 to 5)
//       || (d === 1 && directionFromNeighborToMe === 2) // S to E (sides 2 to 1)
//       || (d === 2 && directionFromNeighborToMe === 1) // E to S (sides 1 to 2)
//       || (d === 3 && directionFromNeighborToMe === 0) // W to N (sides 0 to 3)
//     ];
//   }
// }

// yR, y0, xR, x0
const directions = ['N','S','E','W'];

// each row describes the edges on each side
// (i.e. row 0 is for face 0; NSEW are faces 5423;
//  face 0 is N from the perspective of all 4 faces;
//  flip bounds for neighbor testing on edge 0 and 3)
const edgeToEdgeMap = [
  [[5,'N',true], [4,'N',false],[2,'N',false],[3,'N',true]],
  [[4,'S',false],[5,'S',true], [2,'S',true], [3,'S',false]],
  [[0,'E',false],[1,'E',true], [5,'W',false],[4,'E',false]],
  [[0,'W',true], [1,'W',false],[4,'W',false],[5,'E',false]],
  [[0,'S',false],[1,'N',false],[2,'W',false],[3,'E',false]],
  [[0,'N',true], [1,'S',true], [3,'W',false],[2,'E',false]]
];

class QuadtreeTerrainPlane {
  constructor({ localToWorld, size, worldStretch, heightSamples, sampleResolution, side }) {
    this.localToWorld = localToWorld;
    this.rootSize = size;
    this.worldStretch = worldStretch || new Vector3(1, 1, 1);
    this.heightSamples = heightSamples;
    this.heightSampleResolution = sampleResolution;
    this.side = side;

    const rootNode = new Box3(
      new Vector3(-1 * size, -1 * size, 0),
      new Vector3(size, size, 0),
    );
    this.root = {
      side,
      bounds: rootNode,
      children: [],
      center: rootNode.getCenter(new Vector3()),
      size: rootNode.getSize(new Vector3()),
      neighbors: { N: null, S: null, E: null, W: null },
      root: true
    };
    this.setSphereCenter(this.root);
    this.edges = { N: null, S: null, E: null, W: null };
  }

  getChildren() {
    const children = [];
    this._getChildren(this.root, children);
    return children;
  }

  _getChildren(node, target) {
    if (node.children.length === 0) {
      target.push(node);
      return;
    }

    for (let c of node.children) {
      this._getChildren(c, target);
    }
  }

  setCameraPosition(pos) {
    this._setCameraPosition(this.root, pos);
    this.populateNeighbors();
  }

  _setCameraPosition(child, pos) {
    const distToChild = child.sphereCenter.distanceTo(pos);
    if (distToChild < child.size.x * CHUNK_SPLIT_DISTANCE && child.size.x >= MIN_CHUNK_SIZE * 2) {
      child.children = this.generateChildren(child);

      for (let c of child.children) {
        this._setCameraPosition(c, pos);
      }
    } else {
      child.children = [];
      child.distanceToCamera = distToChild;
    }
  }

  populateNeighbors() {
    this.root.neighbors = { N: null, S: null, E: null, W: null };
    this._populateNeighbors(this.root);
  }

  _populateNeighbors(parent) {
    if (parent.children) {
      // populate node.children.neighbors
      // (order of children is SW, SE, NW, NE)
      parent.children.forEach((child, i) => {
        if (i === 0) {
          child.neighbors.N = parent.children[2];
          child.neighbors.S = this.getClosestNeighborChild(parent.neighbors.S, 2);
          child.neighbors.E = parent.children[1];
          child.neighbors.W = this.getClosestNeighborChild(parent.neighbors.W, 1);
        } else if (i === 1) {
          child.neighbors.N = parent.children[3];
          child.neighbors.S = this.getClosestNeighborChild(parent.neighbors.S, 3);
          child.neighbors.E = this.getClosestNeighborChild(parent.neighbors.E, 0);
          child.neighbors.W = parent.children[0];
        } else if (i === 2) {
          child.neighbors.N = this.getClosestNeighborChild(parent.neighbors.N, 0);
          child.neighbors.S = parent.children[0];
          child.neighbors.E = parent.children[3];
          child.neighbors.W = this.getClosestNeighborChild(parent.neighbors.W, 3);
        } else if (i === 3) {
          child.neighbors.N = this.getClosestNeighborChild(parent.neighbors.N, 1);
          child.neighbors.S = parent.children[1];
          child.neighbors.E = this.getClosestNeighborChild(parent.neighbors.E, 2);
          child.neighbors.W = parent.children[2];
        }
        this._populateNeighbors(child);
      });
    }
  }

  getClosestNeighborChild(neighborParentNode, neighborPos) {
    if (neighborParentNode?.children?.length > 0) return neighborParentNode.children[neighborPos];
    return neighborParentNode;
  }

  // for each of this face's edges, use the edgeToEdgeMap to get the matching
  // edge on the neighboring face, then populate my edge chunks neighbors
  populateNonsideNeighbors(allSides) {
    for (let i in directions) {
      const dir = directions[i];
      const [neighborSideIndex, neighborsEdgeIndex, flipBounds] = edgeToEdgeMap[this.side][i];
      const neighborChildren = (allSides[neighborSideIndex]?.quadtree?.edges || {})[neighborsEdgeIndex];

      // for all of my edge children, find neighbor
      // NOTE: if child has greater or equal size to neighbor, neighbor will not be set
      this.edges[dir].forEach((child) => {
        // on N or S edge, test neighbor with x (else, y); if flip bounds, negate coord
        const testCoord = (flipBounds ? -1 : 1) * child.chunk.center[i < 2 ? 'x' : 'y'];
        const childNeighbor = (neighborChildren || []).find(({ min, max }) => {
          return (testCoord > min && testCoord < max);
        });
        child.chunk.neighbors[dir] = (childNeighbor || {}).chunk;
      });
    }
  }

  // define edges with chunk/min/max
  // TODO (enhancement): this could potentially be handled in an existing loop
  populateEdges() {
    Object.keys(this.edges).forEach((dir) => { this.edges[dir] = []; });

    this.getChildren().forEach((child) => {
      Object.keys(child.neighbors).forEach((dir) => {
        if (!child.neighbors[dir]) {
          const useCoord = (dir === 'N' || dir === 'S') ? 'x' : 'y';
          this.edges[dir].push({
            chunk: child,
            min: child.bounds.min[useCoord],
            max: child.bounds.max[useCoord],
          });
        }
      })
    });
  }

  getHeightMinMax(node) {
    // get resolution-specific edges of the node
    const mult = this.heightSampleResolution / (2 * this.rootSize);
    const xMin = Math.floor((this.rootSize + node.center.x - node.size.x / 2) * mult);
    const xMax = Math.floor((this.rootSize + node.center.x + node.size.x / 2) * mult);
    const yMin = Math.floor((this.rootSize + node.center.y - node.size.y / 2) * mult);
    const yMax = Math.floor((this.rootSize + node.center.y + node.size.y / 2) * mult);

    let minmax = [null, null];
    for (let x = xMin; x < xMax; x++) {
      for (let y = yMin; y < yMax; y++) {
        const cur = this.heightSamples[this.heightSampleResolution * y + x];
        if (minmax[0] === null || cur < minmax[0]) minmax[0] = cur;
        if (minmax[1] === null || cur > minmax[1]) minmax[1] = cur;
      }
    }
    // if (xMin === xMax || yMin === yMax) {
    //   console.log('between points', minmax);
    // }
    return minmax;
  }

  setSphereCenter(node) {
    const [unstretchedMin] = this.getHeightMinMax(node);

    const sphereCenter = node.center.clone();
    sphereCenter.z = this.rootSize;
    sphereCenter.normalize();
    sphereCenter.setLength(unstretchedMin);
    sphereCenter.applyMatrix4(this.localToWorld);
    sphereCenter.multiply(this.worldStretch);
    
    node.sphereCenter = sphereCenter;
    node.sphereCenterHeight = sphereCenter.length();
  }

  generateChildren(parent) {
    const midpoint = parent.bounds.getCenter(new Vector3());
    return [
      {
        b: new Box3(parent.bounds.min, midpoint),
        orientation: 'SW', 
      },
      {
        b: new Box3(
          new Vector3(midpoint.x, parent.bounds.min.y, 0),
          new Vector3(parent.bounds.max.x, midpoint.y, 0)
        ),
        orientation: 'SE', 
      },
      {
        b: new Box3(
          new Vector3(parent.bounds.min.x, midpoint.y, 0),
          new Vector3(midpoint.x, parent.bounds.max.y, 0)
        ),
        orientation: 'NW', 
      },
      {
        b: new Box3(midpoint, parent.bounds.max),
        orientation: 'NE', 
      },
    ].map(({ b }) => {
      const node = {
        side: this.side,
        bounds: b,
        children: [],
        center: b.getCenter(new Vector3()),
        size: b.getSize(new Vector3()),
        neighbors: { N: null, S: null, E: null, W: null },
      };
      this.setSphereCenter(node);
      return node;
    });
  }
}

export default QuadtreeTerrainPlane;