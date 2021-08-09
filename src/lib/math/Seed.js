import { Vector3 } from 'three';
import md5 from 'md5';

// Takes an asteroid seed as an argument and returns various seed types
class Seed {
  constructor(seed) {
    this.seed = seed.substr(2);

    return this;
  }

  // Returns a seeded float with an offset
  getFloat(offset = 0) {
    return this.get16Bit(offset) / 65536;
  }

  // Returns a seeded 8-bit number with an offset
  get8Bit(offset = 0) {
    offset = this._normalizeOffset(offset, 62);
    return parseInt(this.seed.substr(offset, 2), 16);
  }

  // Returns a seeded 16-bit number
  get16Bit(offset = 0) {
    offset = this._normalizeOffset(offset, 60);
    return parseInt(this.seed.substr(offset, 4), 16);
  }

  // Returns a seeded unit vector (scale it if required)
  getVector3(offset = 0) {
    offset = this._normalizeOffset(offset, 56);
    const x = parseInt(this.seed.substr(offset, 4), 16);
    const y = parseInt(this.seed.substr(offset + 4, 4), 16);
    const z = parseInt(this.seed.substr(offset + 8, 4), 16);
    const v  = new Vector3(x, y, z);
    return v.setLength(1);
  }

  _normalizeOffset(offset, length) {
    if (typeof offset === 'string') {
      offset = parseInt(md5(offset), 16) % length;
    }

    if (offset > length) throw new Error('Offset exceeds seed length');
    return offset;
  }
}

export default Seed;
