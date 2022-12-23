#pragma glslify: snoise = require('glsl-noise/simplex/3d')

float normalizeNoise(float n) {
  return (n + 1.0) / 2.0;
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
  point = point * uPointScale + uPointShift;
  float noise = normalizeNoise(recursiveSNoise(point, 0.5, uOctaves));

  // Scale noise value between cutoff and the upper cutoff and return
  float above_cutoff = step(uLowerCutoff, noise);
  float scaled = (noise - uLowerCutoff) / (uUpperCutoff - uLowerCutoff);
  float abundance = min(scaled * above_cutoff, 1.0); // clamp to a max of 1.0
  return abundance;
}

#pragma glslify: export(getAbundance)