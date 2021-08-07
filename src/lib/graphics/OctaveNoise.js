import { Noise } from 'noisejs';

// Calculates additive noise in fractal octaves to get nice variation
class OctaveNoise {

  /**
   * @param seed Must be a float between 0 and 1 or an integer between 1 and 65536
   */
  constructor(seed) {
    this.noiseLib = new Noise(seed);
    return this;
  }

  simplex2(x, y, octaves = 1, persistence = 0.5) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noiseLib.simplex2(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }

  simplex3(x, y, z, octaves = 1, persistence = 0.5) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noiseLib.simplex3(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

export default OctaveNoise;
