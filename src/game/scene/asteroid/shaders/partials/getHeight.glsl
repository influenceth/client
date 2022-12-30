#pragma glslify: cnoise = require('glsl-noise/classic/3d')
#pragma glslify: snoise = require('glsl-noise/simplex/3d')
#pragma glslify: cellular = require('../../../../../lib/graphics/cellular3')
#pragma glslify: getUnitSphereCoords = require('./getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
}

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
  float base = getBase(p, 0.45, octaves);
  float ridges = getRidges(p, 0.5, octaves);
  return (base + ridges * uRidgeWeight) - uRidgeWeight; // [-1,1]
}

// Generates coarse displacement to shape the asteroid
float getDisplacement(vec3 p, int octaves, int maxOctaves) {
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

  for (int i = octaves; i < maxOctaves; i++) {
    maxValue += amplitude;
    amplitude *= uDispPersist;
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
  float totalCraters = 0.0;

  float rims;
  float totalRims = 0.0;

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
  // float passCraters = 0.0;
  // float lastDistanceFromRim = uLandscapeWidth;
  // float lastDistanceFromOuterRim = uLandscapeWidth;
  float lastCraterWidth = 0.0;
  float fadeIn = 1.0;
  // bool isSafeInternalCrater = false;

  for (int i = 0; i < octaves; i++) {
    craterFreq = pow(uCraterFalloff, float(i));
    craterCut = uCraterCut - 0.075 * (1.0 - 1.0 / craterFreq);
    craterWidth = 0.25 * uLandscapeWidth / craterFreq;
    depthToDiameter = clamp(0.4 * smoothstep(0.0, 1.0, 1.0 - log(craterWidth) / 13.0), 0.05, 0.4);

    // fade in last two octaves (to minimize "popping")
    fadeIn = pow(0.6, 3.0 - min(3.0, float(octaves - i)));

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
    craters = pow(smoothstep(0.0, craterCut, cellNoise.x), steep) - 1.0;
    craters *= craterDepth * fadeIn;

    rims = (1.0 - smoothstep(craterCut, craterCut + rimWidth, cellNoise.x)) * rimWeight; // [0,rimWeight]
    rims *= craterDepth * fadeIn;

    // TODO: would it be possible to allow all inner craters BUT scale down their height
    //  so that height is 100% normal at craterWidth from rim (and 0% at 3/4 of way to rim)

    // // apply craters and rims, being thoughtful of overlap
    // isSafeInternalCrater = (
    //   totalCraters < 0.0
    //   // && lastDistanceFromRim > craterWidth
    //   // (the below tries to eliminate truncated-internal-craters by only displaying
    //   // internal craters that do not overlap with the craterWidth-wide space just
    //   // inside the previous rim (+25%)... if this gets dodgy, the above line is
    //   // simpler, but does result in the occasional visual artifact... but what doesn't?)
    //   && lastDistanceFromRim > craterWidth * (uCraterCut + cellNoise.x + 1.25)
    // );

    // // update totals
    // passCraters = isSafeInternalCrater
    //   ? craters
    //   : min(0.0, craters - totalCraters);

    // totalCraters += passCraters;
    // totalRims = isSafeInternalCrater
    //   ? totalRims + rims
    //   : max(totalRims, rims);

    // // update lastDistanceFromRim only if added craters this pass
    // lastDistanceFromRim = passCraters < 0.0
    //   ? craterWidth * (uCraterCut - cellNoise.x) / uCraterCut
    //   : lastDistanceFromRim;

    totalCraters += craters;
    totalRims += rims;
  }

  float totalFeatures = (totalCraters + totalRims) / uMaxCraterDepth;
  totalFeatures = sign(totalFeatures) * pow(abs(totalFeatures), uFeaturesSharpness);
  return totalFeatures;
}

// NOTE: point must be a point on unit sphere
vec4 getHeight(vec3 point, int skipPasses) {
  int modPasses = max(0, uExtraPasses - skipPasses);
  float uCoarseDispFraction = 1.0 - uFineDispFraction;

  // Get course displacement
  float disp = getDisplacement(point, uDispPasses + modPasses, uDispPasses + uExtraPassesMax); // 1 to -1

  // Get final coarse point location (NOTE: the commented out version is technically
  // incorrect (and appearance of "stretching" on craters), but is closer to legacy sampling)
  //point = point * (1.0 + normalizeNoise(disp) * uDispWeight) * uStretch;
  point = point * (1.0 + disp * uCoarseDispFraction * uDispWeight) * uStretch;

  // Get topography and features
  float topo = getTopography(point, uTopoDetail + modPasses); // -1 to 1
  float features = getFeatures(point, uCraterPasses + modPasses - 1); // -1 to 1

  // Define fine displacement
  float fine = (topo * uTopoWeight + features * 2.0) / (uTopoWeight + 1.5); // -1 to 1

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

vec4 getHeight(vec2 flipY, int skipPasses) {
  return getHeight(
    getUnitSphereCoords(flipY), // standardize from flipY to spherical coords
    skipPasses
  );
}

#pragma glslify: export(getHeight)