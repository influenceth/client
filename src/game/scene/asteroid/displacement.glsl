uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uDispFreq;
uniform int uDispPasses;
uniform float uDispPersist;
uniform float uDispWeight;
uniform vec2 uResolution;
uniform vec3 uSeed;
uniform mat4 uTransform;

#pragma glslify: cnoise = require('glsl-noise/classic/3d')
#pragma glslify: snoise = require('glsl-noise/simplex/3d')
#pragma glslify: cellular = require('../../../lib/graphics/cellular3')

vec3 getUnitSphereCoords() {

  // Standardize to a 2 unit cube centered on origin
  vec2 textCoord = (gl_FragCoord.xy - (uResolution.xy / 2.0)) / ((uResolution.xy - 1.0) / 2.0);

  // Scale to chunk size and center
  textCoord = textCoord * uChunkSize + uChunkOffset.xy;

  // Calculate the unit vector for each point thereby spherizing the cube
  vec4 transformed = uTransform * vec4(textCoord.xy, 1.0, 0.0);
  return normalize(vec3(transformed.xyz));
}

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
}

float recursiveCNoise(vec3 p, int octaves) {
  float scale = pow(2.0, min(float(octaves), 6.0));
  vec3 displace;

  for (int i = 0; i < 6; i ++) {
    if (i == octaves) {
      break;
    }

    displace = vec3(
      normalizeNoise(cnoise(p.xyz * scale + displace)),
      normalizeNoise(cnoise(p.yzx * scale + displace)),
      normalizeNoise(cnoise(p.zxy * scale + displace))
    );

    scale *= 0.5;
  }

  float h = normalizeNoise(cnoise(p * scale + displace));
  return pow(h, 1.0);
}

float recursiveSNoise(vec3 p, int octaves, float pers) {
  float total = 0.0;
  float frequency = 1.0;
  float amplitude = 1.0;
  float maxValue = 0.0;

  for (int i = 0; i < 9; i++) {
    if (i == octaves) {
      break;
    }

    total += snoise(p * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= pers;
    frequency *= 2.0;
  }

  return normalizeNoise(total / maxValue);
}

// Generates coarse displacement to shape the asteroid
float getDisplacement(vec3 p) {
  p.y = -1.0 * p.y; // (to match original noise sampling)
  p = p * uDispFreq + uSeed;
  return recursiveSNoise(p, uDispPasses, uDispPersist);
}

void main() {

  // Standardize to unit radius spherical coordinates
  vec3 point = getUnitSphereCoords();

  // Get overall displacement
  float disp = getDisplacement(point);

  // Encode disp and disp-fraction in different channels
  gl_FragColor = vec4(floor(disp * 255.0) / 255.0, fract(disp * 255.0), 0.0, 0.0);
}
