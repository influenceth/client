import { Vector3 } from 'three';
import { Asteroid } from '@influenceth/sdk';

import Seed from '~/lib/math/Seed';
import OctaveNoise from '~/lib/graphics/OctaveNoise';
import constants from '~/lib/constants';

// Responsible for generating a config for any asteroid to be generated
class Config {
  constructor(asteroid) {
    console.log(asteroid);
    this.seedGen = new Seed(Asteroid.Entity.getSeed(asteroid));
    this.type = asteroid.Celestial.celestialType;
    this.radius = asteroid.Celestial.radius * 1000; // adjust to meters
    this.bonuses = Asteroid.Entity.getBonuses(asteroid);

    const dispWeightCoarse = this._dispWeightCoarse();
    const dispWeightFine = this._dispWeightFine();

    return {
      craterCut: this._craterCut(),
      craterFalloff: this._craterFalloff(),
      craterPasses: this._craterPasses(),
      craterPersist: this._craterPersist(),
      craterSteep: this._craterSteep(),
      dispFreq: this._dispFreq(),
      dispPasses: this._dispPasses(),
      dispPersist: this._dispPersist(),
      dispWeight: dispWeightCoarse + dispWeightFine,
      featuresFreq: this._featuresFreq(),
      featuresSharpness: this._featuresSharpness(),
      fineDispFraction: dispWeightFine / (dispWeightCoarse + dispWeightFine),
      radius: this._adjustedRadius(),
      radiusNominal: this.radius,
      ridgeWeight: this._ridgeWeight(),
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

  // Returns the radius of a sphere, which if stretched into an ellipsoid by
  // _stretch, would have the same surface area as the nominal radius
  _adjustedRadius() {
    // R = r / (((sx*sy)^1.6 + (sx*sz)^1.6 + (sy*sz)^1.6) / 3)^(1/3.2)
    const stretch = this._stretch();
    return Math.floor(
      this.radius / Math.pow(
        (Math.pow(stretch.x * stretch.y, 1.6) + Math.pow(stretch.x * stretch.z, 1.6) + Math.pow(stretch.y * stretch.z, 1.6)) / 3,
        1 / 3.2
      )
    );
  }

  /**
   * Defines the cutoff below which craters will be created from cellular noise (less than 1)
   * Larger values will create more / larger craters at each pass
   */
  _craterCut() { // [0.15, 0.20]
    return 0.15 + 0.20 * this._radiusMod(0.5);
  }

  // Determines how much smaller each crater pass is. The higher the number the smaller on each pass
  _craterFalloff() { // [1.5, 2.0]
    return 1.5 + 0.5 * this.seedGen.getFloat('craterFalloff');
  }

  // Number of different sizes of crater passes (at max zoom)
  // (this is static now because increases as zoom in)
  _craterPasses() {
    return 5;
  }

  /**
   * Determines how much impact smaller craters have in the landscape. Higher values make smaller
   * craters more visible.
   */
  _craterPersist() { // [0.45, 0.65]
    return 0.50 - 0.25 * this._radiusMod(2);
  }

  // Determines how steep the walls of the craters are. Higher numbers are steeper
  // (larger asteroids have more gravity, so less steep walls)
  _craterSteep() { // [4.0, 6.0]
    return 6.0 - 2.0 * this._radiusMod(2);
  }

  // Baseline frequency for displacement of the asteroid. Higher values makes it noisier.
  _dispFreq() { // [0.4, 0.6]
    return 0.4 + 0.2 * this.seedGen.getFloat('dispFreq');
  }

  // How many noise passes make related to overall displacement. Higher values should be noisier.
  _dispPasses() { // [4, 6]
    return 4 + 2 * this._radiusMod(0.5);
  }

  /**
   * Persistence of recursive noise that generates displacement. Larger values will result in
   * bumpier asteroids.
   */
  _dispPersist() { // [0.25, 0.45]
    return 0.45 - 0.20 * this._radiusMod(0.5);
  }

  // How much an asteroid should displace out of spherical towards displacement
  _dispWeightCoarse() { // [0.0138, 0.3926]
    return (0.275 + this.seedGen.getFloat('dispWeight') / 10) * (1.05 - this._radiusMod())
  }

  // How much weight for fine-displacement features
  _dispWeightFine() { // [0.125, 0.225]
    return 0.225 - 0.100 * this._radiusMod();
  }

  // Baseline frequency for features like craters and lines. Higher values make noise "noiser"
  _featuresFreq() { // [2.0, 2.5]
    return 0.5 * this._radiusMod(2) + 2.0;
  }

  // Makes features like craters, rims, etc. sharper
  _featuresSharpness() {
    const sharpness = {
      1: 1.00, // C
      2: 0.90, // Cm
      3: 1.00, // Ci
      4: 0.95, // Cs
      5: 0.90, // Cms
      6: 0.95, // Cis
      7: 0.90, // S
      8: 0.80, // Sm
      9: 1.00, // Si
      10: 0.75, // M
      11: 1.00 // I
    };

    return sharpness[this.type];
  }

  // How prominent ridge features appear in proportion to base terrain
  _ridgeWeight() { // [0.75, 1.25]
    return 0.75 + 0.5 * this.seedGen.getFloat('ridgeWeight');
  }

  // How much to take the rims of craters out of round. Larger numbers make them less round.
  _rimVariation() { // [0.0075, 0.0125]
    return 0.0075 + 0.005 * this.seedGen.getFloat('rimVariation');
  }

  // How high the rim of the crater should rise above level ground.
  _rimWeight() { // [0.02, 0.03]
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
    return [ this.radius * minMod, this.radius * maxMod ];  // TODO: should this be adjustedRadius?
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
  _rotationSpeed() { // [1, 10]
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
    return 5;
  }

  /**
   * Baseline frequency for topography. Higher values makes it noisier.
   * Effects color as well
   */
  _topoFreq() { // [1.0, 2.0]
    return 1.0 + this.seedGen.getFloat('topoFreq');
  }

  // How prominent general topography should be on the asteroid as a whole
  _topoWeight() { // [0.2, 0.4]
    return 0.4 - 0.1 * this._radiusMod(2) - 0.1 * this.seedGen.getFloat('topoWeight');
  }
}

export default Config;
