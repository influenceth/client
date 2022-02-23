uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uCleaveCut;
uniform float uCleaveWeight;
uniform float uCraterCut;
uniform float uCraterFalloff;
uniform int uCraterPasses;
uniform float uCraterPersist;
uniform float uCraterSteep;
uniform float uDispFreq;
uniform int uDispPasses;
uniform float uDispPersist;
uniform float uDispWeight;
uniform float uEdgeStrideN;
uniform float uEdgeStrideS;
uniform float uEdgeStrideE;
uniform float uEdgeStrideW;
uniform float uFeaturesFreq;
uniform float uDispFineWeight;
uniform float uOversample;
uniform vec2 uResolution;
uniform vec3 uSeed;
uniform vec3 uStretch;
uniform float uRimVariation;
uniform float uRimWeight;
uniform float uRimWidth;
uniform int uTopoDetail;
uniform float uTopoFreq;
uniform float uTopoWeight;
uniform mat4 uTransform;

#pragma glslify: cnoise = require('glsl-noise/classic/3d')
#pragma glslify: snoise = require('glsl-noise/simplex/3d')
#pragma glslify: cellular = require('../../../lib/graphics/cellular3')

vec3 getUnitSphereCoords(vec2 flipY) {

  // Standardize to a 2 unit cube centered on origin
  vec2 textCoord = (flipY.xy - (uResolution.xy / 2.0)) / ((uResolution.xy - 1.0) / 2.0);

  // Scale to chunk size and center
  textCoord = textCoord * uChunkSize + uChunkOffset.xy;

  // Calculate the unit vector for each point thereby spherizing the cube
  vec4 transformed = uTransform * vec4(textCoord, 1.0, 0.0);
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

// Generates coarse displacement to shape the asteroid
float getDisplacement(vec3 p) {
  p.y = -1.0 * p.y; // (to match original noise sampling)
  p = p * uDispFreq + uSeed;
  return recursiveSNoise(p, uDispPasses, uDispPersist);
}

// Generates overall topography, hills, cliffs, etc.
float getTopography(vec3 p) {
  p = p * uTopoFreq + uSeed;
  float topo = recursiveCNoise(p, uTopoDetail);
  float uniformNoise = fract(sin(dot(p.xy, vec2(12.9898,78.233))) * 43758.5453);
  float noiseWeight = 0.005;
  return ((1.0 - noiseWeight) * topo) + (noiseWeight * uniformNoise);
}

// Generates craters and combines with topography
float getFeatures(vec3 p, int layers) {
  p = p * uFeaturesFreq + uSeed;
  float rim = uCraterCut * uRimWidth;
  float varNoise;
  vec2 cellNoise;
  float craters;
  float weight = 1.0;
  float totalCraters = 0.0;
  float maxTotal = 0.0;

  for (int i = 0; i < 6; i++) {
    if (i == layers) {
      break;
    }

    varNoise = snoise(pow(uCraterFalloff, float(i)) * 8.0 * (p + uSeed));
    cellNoise = cellular(pow(uCraterFalloff, float(i)) * (p + uSeed)) + varNoise * uRimVariation;
    craters = pow((clamp(cellNoise.x, 0.0, uCraterCut) * (1.0 / uCraterCut)), uCraterSteep) - 1.0
      + (1.0 - smoothstep(uCraterCut, uCraterCut + rim, cellNoise.x)) * uRimWeight;
    totalCraters += craters * weight;
    maxTotal += weight;
    weight *= uCraterPersist;
  }

  // Generate some linear features that look like rock cleavage
  float cleave = clamp(snoise(p * uSeed * 50.0) * snoise(p), -1.0, uCleaveCut) * uCleaveWeight;
  maxTotal += uCleaveWeight;

  return (totalCraters + cleave) / maxTotal;
}

vec4 getOutputForPoint(vec2 flipY) {
  // Standardize to unit radius spherical coordinates
  vec3 point = getUnitSphereCoords(flipY);

  // Get course displacement
  float disp = getDisplacement(point);

  // Get final course point location
  point = point * (1.0 + disp * uDispWeight) * uStretch;

  // Get topography to encode seperately
  float topo = getTopography(point);

  // Get fine displacement
  float fine = getFeatures(point, uCraterPasses) + topo * uTopoWeight;

  // Get total displacement
  float height = (1.0 - uDispFineWeight) * disp + uDispFineWeight * fine;

  // Encode height and disp in different channels
  // r, g: used in normalmap
  // b: used in colormap
  return vec4(
    floor(height * 255.0) / 255.0,
    fract(height * 255.0),
    topo,
    1.0
  );
}

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  float edgeDistance = 0.5 + uOversample;
  float strideX = flipY.y <= edgeDistance
    ? uEdgeStrideS
    : (
      flipY.y >= uResolution.y - edgeDistance
        ? uEdgeStrideN
        : 1.0
    );
  float x = flipY.x - edgeDistance;
  float strideModX = mod(x, strideX);

  float strideY = flipY.x <= edgeDistance
    ? uEdgeStrideW
    : (
      flipY.x >= uResolution.x - edgeDistance
        ? uEdgeStrideE
        : 1.0
    );
  float y = flipY.y - edgeDistance;
  float strideModY = mod(y, strideY);

  float mixAmount = max(strideModX / strideX, strideModY / strideY);

  vec2 point1 = vec2(
    strideModX > 0.0 ? floor(x / strideX) * strideX + edgeDistance : flipY.x,
    strideModY > 0.0 ? floor(y / strideY) * strideY + edgeDistance : flipY.y
  );
  vec4 output1 = getOutputForPoint(point1);
  float height1 = (output1.x * 255.0 + output1.y) / 255.0;

  vec2 point2 = vec2(
    strideModX > 0.0 ? ceil(x / strideX) * strideX + edgeDistance : flipY.x,
    strideModY > 0.0 ? ceil(y / strideY) * strideY + edgeDistance : flipY.y
  );
  vec4 output2 = getOutputForPoint(point2);
  float height2 = (output2.x * 255.0 + output2.y) / 255.0;

  float height = mix(height1, height2, mixAmount);
  float topo = mix(output1.z, output1.z, mixAmount);

  gl_FragColor = vec4(
    floor(height * 255.0) / 255.0,
    fract(height * 255.0),
    topo,
    1.0
  );
}
