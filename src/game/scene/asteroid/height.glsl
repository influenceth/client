uniform sampler2D tDisplacementMap;
uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uCleaveCut;
uniform float uCleaveWeight;
uniform float uCraterCut;
uniform float uCraterFalloff;
uniform int uCraterPasses;
uniform float uCraterPersist;
uniform float uCraterSteep;
uniform float uDispWeight;
uniform float uFeaturesFreq;
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

float getDisplacement() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 disp16 = texture2D(tDisplacementMap, uv).xy;
  float disp = disp16.x * 255.0 + disp16.y;
  return 1.0 - disp / 256.0;
}

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
    craters = pow((clamp(cellNoise.x, 0.0, uCraterCut) * (1.0 / uCraterCut)), uCraterSteep) - 1.0 +
      (1.0 - smoothstep(uCraterCut, uCraterCut + rim, cellNoise.x)) * uRimWeight;
    totalCraters += craters * weight;
    maxTotal += weight;
    weight *= uCraterPersist;
  }

  // Generate some linear features that look like rock cleavage
  float cleave = clamp(snoise(p * uSeed * 50.0) * snoise(p), -1.0, uCleaveCut) * uCleaveWeight;
  maxTotal += uCleaveWeight;

  return (totalCraters + cleave) / maxTotal;
}

void main() {

  // Standardize to unit radius spherical coordinates
  vec3 point = getUnitSphereCoords();

  // Get overall displacement
  float disp = getDisplacement();

  // Get final point location
  point = point * (1.0 + disp * uDispWeight) * uStretch;

  // Get topography to encode seperately
  float topo = getTopography(point);

  // Combine it all into a heightmap
  float height = 0.5 * (getFeatures(point, uCraterPasses) + topo * uTopoWeight) + 0.5;

  // Encode height and disp in different channels
  // r, g: used in normalmap
  // b: used in colormap
  gl_FragColor = vec4(
    floor(height * 255.0) / 255.0,
    fract(height * 255.0),
    topo,
    0.0
  );
}
