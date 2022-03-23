import { Vector3 } from 'three';
import Seed from '~/lib/math/Seed';
import OctaveNoise from '~/lib/graphics/OctaveNoise';
import constants from '~/lib/constants';

// TODO: this should probably be elsewhere in the dir tree since it's not only used by scene

// Responsible for generating a config for any asteroid to be generated
class Config {
  constructor(asteroid) {
    this.seedGen = new Seed(asteroid.seed);
    this.type = asteroid.spectralType;
    this.radius = asteroid.radius
    this.bonuses = asteroid.bonuses;

    return {
      cleaveCut: this._cleaveCut(),
      cleaveWeight: this._cleaveWeight(),
      craterCut: this._craterCut(),
      craterFalloff: this._craterFalloff(),
      craterPasses: this._craterPasses(),
      craterPersist: this._craterPersist(),
      craterSteep: this._craterSteep(),
      dispFreq: this._dispFreq(),
      dispPasses: this._dispPasses(),
      dispPersist: this._dispPersist(),
      dispWeight: this._dispWeight(),
      featuresFreq: this._featuresFreq(),
      normalIntensity: this._normalIntensity(),
      radius: this.radius,
      ringsMinMax: this._ringsMinMax(),
      ringsPresent: this._ringsPresent(),
      ringsVariation: this._ringsVariation(),
      rimVariation: this._rimVariation(),
      rimWeight: this._rimWeight(),
      rimWidth: this._rimWidth(),
      rotationSpeed: this._rotationSpeed(),
      seed: this._seed(),
      spectralType: this.type,
      stretch: this._stretch(),
      topoDetail: this._topoDetail(),
      topoFreq: this._topoFreq(),
      topoWeight: this._topoWeight()
    };
  }

  // Returns a modifier based on the radius raise to a power (optional)
  _radiusMod(pow = 1) {
    return Math.pow(this.radius / constants.MAX_ASTEROID_RADIUS, pow);
  }

  // Defines the upper cutoff (starts at -1.0) for cleavage lines. Must be less than 0
  _cleaveCut() {
    return -0.15 - 0.2 * this.seedGen.getFloat('cleaveCut');
  }

  // How prominent the cleavage line features appear (can range from 0 to 1)
  _cleaveWeight() {
    return 0.4 * this.seedGen.getFloat('cleaveWeight');
  }

  /**
   * Defines the cutoff below which craters will be created from cellular noise (less than 1)
   * Larger values will create more / larger craters at each pass
   */
  _craterCut() {
    return 0.15 + 0.15 * this._radiusMod(2);
  }

  // Determines how much smaller each crater pass is. The higher the number the smaller on each pass
  _craterFalloff() {
    return 1.5 + 0.5 * this.seedGen.getFloat('craterFalloff');
  }

  // Number of different sizes of crater passes
  _craterPasses() {
    return Math.round(4 + 3 * this._radiusMod(2));
  }

  /**
   * Determines how much impact smaller craters have in the landscape. Higher values make smaller
   * craters more visible.
   */
  _craterPersist() {
    return 0.75 - 0.2 * this._radiusMod(2);
  }

  // Determines how steep the walls of the craters are. Higher numbers are steeper
  _craterSteep() {
    return 8.0;
  }

  // Baseline frequency for displacement of the asteroid. Higher values makes it noisier.
  _dispFreq() {
    return 0.4 + 0.2 * this.seedGen.getFloat('dispFreq');
  }

  // How many noise passes make related to overall displacement. Higher values should be noisier.
  _dispPasses() {
    return 4 + 2 * this._radiusMod(0.5);
  }

  /**
   * Persistence of recursive noise that generates displacement. Larger values will result in
   * bumpier asteroids.
   */
  _dispPersist() {
    return 0.45 - 0.20 * this._radiusMod(0.5);
  }

  // How much an asteroid should displace out of spherical towards displacement
  _dispWeight() {
    return (0.275 + this.seedGen.getFloat('dispWeight') / 10) * (1.05 - this._radiusMod())
  }

  // Baseline frequency for features like craters and lines. Higher values make noise "noiser"
  _featuresFreq() {
    return 0.5 * this._radiusMod(2) + 2.0;
  }

  // Determines how prominent the normal mapping shading is. Lower values make for darker / sharper shadows
  _normalIntensity() {
    return 0.1 * this._radiusMod(2) + 0.4;
  }

  // How much to take the rims of craters out of round. Larger numbers make them less round.
  _rimVariation() {
    return 0.0075 + 0.005 * this.seedGen.getFloat('rimVariation');
  }

  // How high the rim of the crater should rise above level ground.
  _rimWeight() {
    return 0.03 - 0.01 * this._radiusMod(2);
  }

  // Ratio of rim width to crater width (0.1 would make rim 10% width of the crater)
  _rimWidth() {
    return 0.2;
  }

  _ringsMinMax() {
    const minMod = 1.5 + this.seedGen.getFloat('ringsMin') * 0.3;
    const widthMod = this.seedGen.getFloat('ringsMax') * 0.5;
    let maxMod = minMod + widthMod;
    if (maxMod > 2.0) maxMod = 2.0;
    return [ this.radius * minMod, this.radius * maxMod ];
  }

  _ringsPresent() {
    if (this.bonuses.some(b => b.name === 'Volatile3') && this.bonuses.some(b => b.type === 'yield' && b.yield > 1)) {
      return true;
    } else {
      return false;
    }
  }

  _ringsVariation() {
    const noise = new OctaveNoise(this.seedGen.get16Bit());
    const variation = [];

    for (let i = 0; i < 512; i++) {
      variation.push(noise.simplex2(i / 20, 0, 8, 0.5));
    }

    for (let i = 512; i < 1024; i++) {
      variation.push(noise.simplex2(i / 10, 0, 4, 0.5));
    }

    return variation;
  }

  // Returns the number of rotations per day (1 real-time hour)
  _rotationSpeed() {
    return 1 + this.seedGen.getFloat('rotationSpeed') * 9 * (1 - this._radiusMod());
  }

  // Seed transformed into a 3D vector
  _seed() {
    return this.seedGen.getVector3();
  }

  // Vector to stretch the asteroid along
  _stretch() {
    const mod = 0.45 * (1 - this._radiusMod(2));
    return new Vector3(1, 1, 1).sub(this.seedGen.getVector3().multiplyScalar(mod));
  }

  // Recursive noise passes to determine detail of topography. Higher numbers have finer detail.
  _topoDetail() {
    return 8;
  }

  /**
   * Baseline frequency for topography. Higher values makes it noisier.
   * Effects color as well
   */
  _topoFreq() {
    return 1.0 + this.seedGen.getFloat('topoFreq');
  }

  // How prominent general topography should be on the asteroid as a whole
  _topoWeight() {
    return 0.4 - 0.1 * this._radiusMod(2) - 0.1 * this.seedGen.getFloat('topoWeight');
  }
}

export default Config;
