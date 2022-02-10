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
      console.log('between points', minmax);
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

  generateChildren(child) {
    const midpoint = child.bounds.getCenter(new Vector3());

    // Bottom left
    const b1 = new Box3(child.bounds.min, midpoint);

    // Bottom right
    const b2 = new Box3(
      new Vector3(midpoint.x, child.bounds.min.y, 0),
      new Vector3(child.bounds.max.x, midpoint.y, 0)
    );

    // Top left
    const b3 = new Box3(
      new Vector3(child.bounds.min.x, midpoint.y, 0),
      new Vector3(midpoint.x, child.bounds.max.y, 0)
    );

    // Top right
    const b4 = new Box3(midpoint, child.bounds.max);

    return [b1, b2, b3, b4].map((b) => {
      const node = {
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