import { Box3, Vector3 } from 'three';

class QuadtreePlane {
  constructor({ localToWorld, minChunkSize, size, worldStretch }) {
    this.localToWorld = localToWorld;
    this.minChunkSize = minChunkSize;
    this.size = size;
    this.worldStretch = worldStretch || new Vector3(1, 1, 1);

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
    this.root.sphereCenter = this.getSphereCenter(this.root);
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
    // TODO: resolution (was 1.25, then 1.4)
    if (distToChild < child.size.x * 1.25 && child.size.x >= this.minChunkSize * 2) {
      child.children = this.generateChildren(child);

      for (let c of child.children) {
        this._setCameraPosition(c, pos);
      }
    } else {
      child.children = [];
    }
  }

  getSphereCenter(node) {
    const sphereCenter = node.center.clone();
    sphereCenter.applyMatrix4(this.localToWorld);
    sphereCenter.normalize();
    sphereCenter.multiplyScalar(this.size);
    sphereCenter.multiply(this.worldStretch);
    return sphereCenter;
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
      node.sphereCenter = this.getSphereCenter(node);
      return node;
    });
  }
}

export default QuadtreePlane;