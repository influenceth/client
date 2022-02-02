uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uDispFreq;
uniform int uDispPasses;
uniform float uDispPersist;
uniform float uDispWeight;
uniform vec2 uResolution;
uniform vec3 uSeed;
uniform mat4 uTransform;

#pragma glslify: snoise = require('glsl-noise/simplex/3d')

vec3 getUnitSphereCoords() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  //vec2 flipY = vec2(gl_FragCoord.xy);

  // Standardize to a 2 unit cube centered on origin
  vec2 textCoord = (flipY.xy - (uResolution.xy / 2.0)) / ((uResolution.xy - 1.0) / 2.0);

  // Scale to chunk size and center
  textCoord = textCoord * uChunkSize + uChunkOffset.xy;

  // Calculate the unit vector for each point thereby spherizing the cube
  vec4 transformed = uTransform * vec4(textCoord.xy, 1.0, 0.0);
  return normalize(vec3(transformed.xyz));
}

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
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

  //gl_FragColor = vec4(floor(disp * 255.0) / 255.0, fract(disp * 255.0), 0.0, 0.0);

  disp = disp * 255.0;
  float base = floor(disp);
  float extra = round(fract(disp) * 3.0);

  // 765-levels of gray for displacement map
  gl_FragColor = vec4(
    (base + (extra > 0.0 ? 1.0 : 0.0)) / 255.0,
    (base + (extra > 1.0 ? 1.0 : 0.0)) / 255.0,
    (base + (extra > 2.0 ? 1.0 : 0.0)) / 255.0,
    1.0
  );
}
