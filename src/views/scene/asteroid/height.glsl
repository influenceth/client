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
uniform mat3 uTransform;

#pragma glslify: cnoise = require(glsl-noise/classic/3d)
#pragma glslify: snoise = require(glsl-noise/simplex/3d)
#pragma glslify: cellular = require(../../../lib/graphics/cellular3)

const float PI = 3.1415926535897932384626433832795;

vec3 uvToSphere(vec2 uv) {
  // Standardize to a 2 unit cube centered on origin
  vec2 textCoord = (gl_FragCoord.xy - (uResolution.xy / 2.0)) / ((uResolution.xy - 1.0) / 2.0);

  // Calculate the unit vector for each point thereby spherizing the cube
  return normalize(uTransform * vec3(textCoord.xy, 1.0));
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
  p = p * uDispFreq + uSeed;
  return recursiveSNoise(p, uDispPasses, uDispPersist);
}

// Generates overall topography, hills, cliffs, etc.
float getTopography(vec3 p) {
  p = p * uTopoFreq + uSeed;
  return recursiveCNoise(p, uTopoDetail);
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
  // Reduce by resolution
  vec2 uv = (gl_FragCoord.xy - 0.5) / (uResolution - 1.0);

  // Standardize to unit radius spherical coordinates
  vec3 point = uvToSphere(uv);

  // Get overall displacement
  float disp = getDisplacement(point);
  point = point * (1.0 + disp * uDispWeight) * uStretch;

  // Get topography to encode seperately
  float topo = getTopography(point);

  // Combine it all into a heightmap
  float height = 0.5 * (getFeatures(point, uCraterPasses) + topo * uTopoWeight) + 0.5;

  // Encode height and disp in different channels
  gl_FragColor = vec4(floor(height * 255.0) / 255.0, fract(height * 255.0), topo, disp);
}
