import { Box3, Vector3 } from 'three';
import constants from '~/lib/constants';

const {
  MIN_CHUNK_SIZE,
  CHUNK_SPLIT_DISTANCE
} = constants;

class QuadtreePlane {
  constructor({ localToWorld, size, worldStretch, heightSamples, sampleResolution }) {
    this.localToWorld = localToWorld;
    this.rootSize = size;
    this.worldStretch = worldStretch || new Vector3(1, 1, 1);
    this.heightSamples = heightSamples;
    this.resolution = sampleResolution;

    const rootNode = new Box3(
      new Vector3(-1 * size, -1 * size, 0),
      new Vector3(size, size, 0),
    );
    this.root = {
      bounds: rootNode,
      children: [],
      center: rootNode.getCenter(new Vector3()),
      size: rootNode.getSize(new Vector3()),
      neighbors: {},
      root: true
    };
    this.setSphereCenter(this.root);
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
    this._populateNeighbors(this.root);
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
    }
  }

  _populateNeighbors(parent) {
    if (parent.root) {
      // TODO: attach neighboring sides (w/ transforms)
    }
    if (parent.children) {
      // populate node.children.neighbors (SW, SE, NW, NE)
      parent.children.forEach((child, i) => {
        child.neighbors = {};
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

  getHeightMinMax(node) {
    // get resolution-specific edges of the node
    const mult = this.resolution / (2 * this.rootSize);
    const xMin = Math.floor((this.rootSize + node.center.x - node.size.x / 2) * mult);
    const xMax = Math.floor((this.rootSize + node.center.x + node.size.x / 2) * mult);
    const yMin = Math.floor((this.rootSize + node.center.y - node.size.y / 2) * mult);
    const yMax = Math.floor((this.rootSize + node.center.y + node.size.y / 2) * mult);

    let minmax = [null, null];
    for (let x = xMin; x < xMax; x++) {
      for (let y = yMin; y < yMax; y++) {
        const cur = this.heightSamples[this.resolution * y + x];
        if (minmax[0] === null || cur < minmax[0]) minmax[0] = cur;
        if (minmax[1] === null || cur > minmax[1]) minmax[1] = cur;
      }
    }
    if (xMin === xMax || yMin === yMax) {
      // console.log('between points', minmax);
    }
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
    ].map(({ b, orientation }) => {
      const node = {
        breadcrumbs: [...(parent.breadcrumbs || []), orientation],  // TODO: do we need breadcrumbs?
        bounds: b,
        children: [],
        center: b.getCenter(new Vector3()),
        size: b.getSize(new Vector3())
      };
      this.setSphereCenter(node);
      return node;
    });
  }
}

export default QuadtreePlane;