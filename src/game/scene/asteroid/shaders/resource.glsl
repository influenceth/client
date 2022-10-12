uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uResolution;
uniform float uResource;
uniform mat4 uTransform;

uniform int uExtraPasses;
uniform int uExtraPassesMax;
uniform bool uOversampling;
uniform vec3 uSeed;

#pragma glslify: snoise = require('glsl-noise/simplex/3d')
#pragma glslify: getUnitSphereCoords = require('./partials/getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
}

float recursiveSNoise(vec3 p, float pers, int octaves, int maxOctaves) {
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
  for (int i = octaves; i < maxOctaves; i++) {
    maxValue += amplitude;
    amplitude *= pers;
  }

  return total / maxValue;
}

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);
  vec3 point = getUnitSphereCoords(flipY);

  int defaultPasses = 3;

  // [-1,1]
  float abundance = recursiveSNoise(1.5 * (point + uResource), 0.3, defaultPasses + uExtraPasses, defaultPasses + uExtraPassesMax);
  // [0, 1]
  abundance = pow((abundance + 1.0) / 2.0, 3.0);
  // [0, 4]
  // TODO: the smooth size should be smaller the more zoomed in to avoid "blurry" look
  //  (i.e. could relate to chunksize)
  abundance = smoothstep(0.19, 0.2, abundance)
    + smoothstep(0.39, 0.4, abundance)
    + smoothstep(0.59, 0.6, abundance)
    + smoothstep(0.79, 0.8, abundance);
  // [0, 1]
  abundance /= 4.0;

  gl_FragColor = vec4(abundance, abundance, abundance, 0.5);
}
