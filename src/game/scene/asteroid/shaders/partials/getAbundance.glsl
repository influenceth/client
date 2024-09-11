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

float polyFit(float noise) {
  float x = noise;
  float y = uPolyParams[0];
  y += uPolyParams[1] * x;
  x = x * noise;
  y += uPolyParams[2] * x;
  x = x * noise;
  y += uPolyParams[3] * x;
  x = x * noise;
  y += uPolyParams[4] * x;
  x = x * noise;
  y += uPolyParams[5] * x;
  x = x * noise;
  y += uPolyParams[6] * x;
  x = x * noise;
  y += uPolyParams[7] * x;
  return clamp(y, 0.0, 1.0);
}

float getAbundance(vec3 point) {
  point = point * uPointScale + uPointShift;
  float noise = normalizeNoise(recursiveSNoise(point, 0.5, uOctaves));

  // Get percentile of noise, scale and clamp to [0,1] and adjust by floor abundance
  float percentile = polyFit(clamp(noise, 0.0, uPolyLimit));
  float abundance = clamp((percentile + uAbundance - 1.0) / uAbundance, 0.0, 1.0);
  float floorAbundance = uAbundance / 2.0;
  abundance = abundance * (1.0 - floorAbundance) + floorAbundance;

  return abundance;
}

#pragma glslify: export(getAbundance)