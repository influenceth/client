#pragma glslify: cnoise = require('glsl-noise/classic/3d')
#pragma glslify: snoise = require('glsl-noise/simplex/3d')
#pragma glslify: cellular = require('../../../../../lib/graphics/cellular3')
#pragma glslify: getUnitSphereCoords = require('./getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)

float normalizeNoise(float n) {
  return clamp(0.5 * n + 0.5, 0.0, 1.0);
}

// TODO: this is really heavy -- calls snoise 3x octaves + 1 times (the same as the rest of the features combined)
float getBase(vec3 p, float pers, int octaves) {
  float scale = pow(2.0, float(octaves));
  vec3 displace;

  for (int i = 0; i < octaves; i ++) {
    displace = vec3(
      normalizeNoise(snoise(p.xyz * scale + displace)) * pers,
      normalizeNoise(snoise(p.yzx * scale + displace)) * pers,
      normalizeNoise(snoise(p.zxy * scale + displace)) * pers
    );

    scale *= 0.5;
  }

  return normalizeNoise(snoise(p * scale + displace));
}

float getRidges(vec3 p, float pers, int octaves) {
  float total = 0.0;
  float frequency = 1.0;
  float amplitude = 1.0;
  float maxValue = 0.0;

  for (int i = 0; i < octaves; i++) {
    total += abs(snoise(p * frequency) * amplitude);
    maxValue += amplitude;
    amplitude *= pers;
    frequency *= 2.0;
  }

  return 1.0 - sqrt(total / maxValue);
}

// Generates overall topography, hills, cliffs, etc.
float getTopography(vec3 p, int octaves) {
  vec3 point = p * uTopoFreq + uSeed;
  float base = getBase(p, 0.45, octaves); // [0,1]
  float ridges = getRidges(p, 0.5, octaves); // [0,1]
  return (base + ridges * uRidgeWeight) - uRidgeWeight; // [-uRidgeWeight, 1]
  // TODO (maybe?): below would be [0, 1]
  // return (base + ridges * uRidgeWeight) / (1.0 + uRidgeWeight);
}

// Generates coarse displacement to shape the asteroid
float getDisplacement(vec3 p, int octaves) {
  p.y *= -1.0;  // (to match original noise sampling)
  p = p * uDispFreq + uSeed;

  float total = 0.0;
  float frequency = 1.0;
  float amplitude = 1.0;
  float maxValue = 0.0;

  for (int i = 0; i < octaves; i++) {
    total += snoise(p * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= uDispPersist;
    frequency *= 2.0;
  }

  return total / maxValue;
}

// Generates craters and combines with topography
/* TODO (enhancement): ejecta
  can throw ejecta from uCraterCut to 3x beyond rim
  exponentially decreasing snoise would probably be fine, but would be nice if could make look like linear streaks
  new craters should clear existing ejecta
*/
/* TODO (enhancement): complex craters
    at a certain diameter, craters start evolving more complex features
    - the threshold diameter is inversely proportional to gravity (i.e. radius, type?)
      - this transition threshold diameter range is 2-3k on earth; 10-30k on moon
      - NOTE: we are using flat 10000.0 below, which is only really applicable to largest asteroids
    - features
      - terracing: could change rim function to simulate terracing (or add sin curve or just add noise)
      - central peak: (i.e. if (cellNoise.x < 0.1) craters += 1.0 - pow(cellNoise.x / 0.1, 2.0))
      - flat floor: (less relevant to explicitly add since slope should simulate)
*/
/* TODO (enhancement): modify crater shape and incidence by asteroid composition */
float getFeatures(vec3 p, int octaves) {
  p = p * uFeaturesFreq + uSeed;

  float varNoise;
  vec2 cellNoise;

  float craters;
  float rims;

  int age = 0;  // 0 (oldest) -> 2 (youngest)
  float ageMults[3] = float[3](0.75, 1.0, 1.5);
  float steep = 0.0;
  float rimWeight = 0.0;
  float rimWidth = 0.0;
  float rimVariation = 0.0;
  float depthToDiameter = 0.0;
  float craterCut = 0.0;
  float craterFreq = 0.0;
  float craterAndRimWidth = 0.0;
  float craterWidth = 0.0;
  float craterDepth = 0.0;
  float craterPersist = 1.0;
  float octaveFeatures = 0.0;
  float totalFeatures = 0.0;

  float unattenuatedOctaves = float(octaves) - 3.0;

  for (int i = 0; i < octaves; i++) {
    craterFreq = pow(uCraterFalloff, float(i));
    craterCut = uCraterCut - 0.075 * (1.0 - 1.0 / craterFreq);
    craterWidth = 0.25 * uLandscapeWidth / craterFreq;
    depthToDiameter = clamp(0.4 * smoothstep(0.0, 1.0, 1.0 - log(craterWidth) / 13.0), 0.05, 0.4);

    // always treat hugest craters as old
    age = craterWidth > 30000.0 ? 0 : i % 3;

    // age-specific tweaks
    rimWeight = uRimWeight * ageMults[age];
    rimWidth = craterCut * uRimWidth * ageMults[2 - age];
    rimVariation = uRimVariation * ageMults[2 - age];
    craterDepth = depthToDiameter * craterWidth * ((ageMults[age] + 1.0) / 3.5) * craterPersist;
    steep = uCraterSteep * ageMults[age];

    // noise processing
    varNoise = snoise(craterFreq * 4.0 * (p + uSeed));
    cellNoise = cellular(craterFreq * 0.5 * (p + uSeed)) + varNoise * rimVariation;

    // calculate craters and rims from noise functions
    craters = pow(smoothstep(0.0, craterCut, cellNoise.x), steep) - 1.0; // [-1, 0]
    rims = (1.0 - smoothstep(craterCut, craterCut + rimWidth, cellNoise.x)) * rimWeight; // [0, rimWeight]

    // total features
    totalFeatures += craterDepth * (craters + rims);

    // for matching legacy, taper off final two passes
    craterPersist *= 1.0 - step(unattenuatedOctaves, float(i)) * 0.35;
  }

  totalFeatures /= uMaxCraterDepth; // [-1, 1]?
  totalFeatures = sign(totalFeatures) * pow(abs(totalFeatures), uFeaturesSharpness); // [-1, 1] (if above is [-1, 1])
  return totalFeatures;
}

// NOTE: point must be a point on unit sphere
vec4 getHeight(vec3 point) {
  float uCoarseDispFraction = 1.0 - uFineDispFraction;

  // Get course displacement
  float disp = getDisplacement(point, uDispPasses); // [-1, 1]

  // Get final coarse point location
  point = point * (1.0 + disp * uCoarseDispFraction * uDispWeight) * uStretch;

  // Get topography and features
  // TODO (maybe?): topo should probably technically scale from [0, 1] or [-1, 1]
  float topo = getTopography(point, uTopoPasses); // [-uRidgeWeight, 1]
  float features = getFeatures(point, uCraterPasses); // -1 to 1

  // Define fine displacement
  // TODO (maybe?): this technically should scale [-1, 1]
  float fine = (topo * uTopoWeight + features * 2.0) / (uTopoWeight + 1.5); // [-1, 1]

  // Get total displacement
  float height = normalizeNoise(uCoarseDispFraction * disp + uFineDispFraction * fine);

  // height = abs(sin(point.x));

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

vec4 getHeight(vec2 flipY) {
  return getHeight(
    getUnitSphereCoords(flipY) // standardize from flipY to spherical coords
  );
}

#pragma glslify: export(getHeight)