#pragma glslify: snoise = require('glsl-noise/simplex/3d')

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
}

float recursiveSNoise(vec3 p, float pers, int octaves) {
  float total = 0.0;
  float frequency = 1.0;
  float amplitude = 1.0;
  float maxValue = 0.0;

  for (int i = 0; i < octaves; i++) {
    total += snoise(p * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= pers;
    frequency *= 2.0;
  }

  return total / maxValue;
}

float getAbundance(vec3 point) {
  int defaultPasses = 3;

  // [-1,1]
  float abundance = recursiveSNoise(1.5 * (point + uResource), 0.3, defaultPasses);

  // [0, 1]
  return pow((abundance + 1.0) / 2.0, 3.0);
}

#pragma glslify: export(getAbundance)