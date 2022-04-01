#pragma glslify: cnoise = require('glsl-noise/classic/3d')
#pragma glslify: snoise = require('glsl-noise/simplex/3d')
#pragma glslify: cellular = require('../../../../../lib/graphics/cellular3')
#pragma glslify: getUnitSphereCoords = require('./getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
}

float recursiveCNoise(vec3 p, int octaves) {
  float scale = pow(2.0, float(octaves));
  vec3 displace;

  for (int i = 0; i < octaves; i ++) {
    displace = vec3(
      normalizeNoise(cnoise(p.xyz * scale + displace)),
      normalizeNoise(cnoise(p.yzx * scale + displace)),
      normalizeNoise(cnoise(p.zxy * scale + displace))
    );

    scale *= 0.5;
  }

  return cnoise(p * scale + displace);
}

float recursiveSNoise(vec3 p, int octaves, float pers) {
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

// Generates coarse displacement to shape the asteroid
float getDisplacement(vec3 p, int octaves) {
  p.y *= -1.0;  // (to match original noise sampling)
  return recursiveSNoise(p * uDispFreq + uSeed, octaves, uDispPersist);
}

// Generates overall topography, hills, cliffs, etc.
float getTopography(vec3 p, int octaves) {
  return recursiveCNoise(p * uTopoFreq + uSeed, octaves);
}

// Generates craters and combines with topography
float getFeatures(vec3 p, int octaves) {
  p = p * uFeaturesFreq + uSeed;
  float rim = uCraterCut * uRimWidth;
  float varNoise;
  vec2 cellNoise;
  float craters;
  float weight = 1.0;
  float totalCraters = 0.0;
  float maxTotal = 0.0;

  for (int i = 0; i < octaves; i++) {
    varNoise = snoise(pow(uCraterFalloff, float(i)) * 8.0 * (p + uSeed));
    cellNoise = cellular(pow(uCraterFalloff, float(i)) * (p + uSeed)) + varNoise * uRimVariation;
    craters = pow((clamp(cellNoise.x, 0.0, uCraterCut) * (1.0 / uCraterCut)), uCraterSteep) - 1.0
      + (1.0 - smoothstep(uCraterCut, uCraterCut + rim, cellNoise.x)) * uRimWeight;
    totalCraters += craters * weight;
    maxTotal += weight;
    // (fade last two passes more so less obvious popping in)
    weight *= uCraterPersist * (i < octaves - 2 ? 1.0 : 0.6);
  }

  // Generate some linear features that look like rock cleavage
  float cleave = clamp(snoise(p * uSeed * 50.0) * snoise(p), -1.0, uCleaveCut) * uCleaveWeight;
  maxTotal += uCleaveWeight;

  return (totalCraters + cleave) / maxTotal;
}

vec4 getHeight(vec2 flipY, int skipPasses) {
  int modPasses = max(0, uExtraPasses - skipPasses);
  float uCoarseDispFraction = 1.0 - uFineDispFraction;

  // Standardize to unit radius spherical coordinates
  vec3 point = getUnitSphereCoords(flipY);

  // Get course displacement
  float disp = getDisplacement(point, uDispPasses + modPasses); // 1 to -1

  // Get final coarse point location (NOTE: the commented out version is technically
  // incorrect (and appearance of "stretching" on craters), but is closer to legacy sampling)
  //point = point * (1.0 + normalizeNoise(disp) * uDispWeight) * uStretch;
   point = point * (1.0 + disp * uCoarseDispFraction * uDispWeight) * uStretch;

  // Get topography and features
  float topo = getTopography(point, uTopoDetail + modPasses); // -1 to 1
  float features = getFeatures(point, uCraterPasses + modPasses); // -1 to 1

  // Define fine displacement
  float fine = (topo * uTopoWeight + features * 2.0) / (uTopoWeight + 2.0); // -1 to 1

  // Get total displacement
  float height = normalizeNoise(uCoarseDispFraction * disp + uFineDispFraction * fine);

  // Encode height and disp in different channels
  // r, g: used in displacement map
  // b, a: used in normal map
  return vec4(
    floor(height * 255.0) / 255.0,
    fract(height * 255.0),
    normalizeNoise(topo),
    0.0
  );
}

#pragma glslify: export(getHeight)