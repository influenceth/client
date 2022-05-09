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

// Generates overall topography, hills, cliffs, etc.
float getTopography(vec3 p, int octaves) {
  return recursiveCNoise(p * uTopoFreq + uSeed, octaves);
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

// Generates coarse displacement to shape the asteroid
float getDisplacement(vec3 p, int octaves, int maxOctaves) {
  p.y *= -1.0;  // (to match original noise sampling)
  return recursiveSNoise(p * uDispFreq + uSeed, uDispPersist, octaves, maxOctaves);
}

// Generates craters and combines with topography
/* TODO (enhancement): ejecta
  can throw ejecta from uuCraterCut to 3x beyond rim
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
  float craterFreq = 0.0;
  float craterAndRimWidth = 0.0;
  float craterWidth = 0.0;
  float craterDepth = 0.0;
  float craterPersist = 1.0;
  float passCraters = 0.0;
  float lastDistanceFromRim = uLandscapeWidth;
  float lastDistanceFromOuterRim = uLandscapeWidth;
  float lastCraterWidth = 0.0;
  float log10 = log(10.0);
  float fadeIn = 1.0;
  bool isSafeInternalCrater = false;
  for (int i = 0; i < octaves; i++) {
    craterFreq = pow(uCraterFalloff, float(i));
    craterWidth = 2.0 * 0.3 * uLandscapeWidth / (craterFreq * 2.0 + 1.0);
    depthToDiameter = 0.2 * exp(-pow((log(craterWidth)/log10 - 2.25) / 1.4, 2.0) / 2.0);
    
    // fade in last two octaves (to minimize "popping")
    fadeIn = pow(0.6, 3.0 - min(3.0, float(octaves - i)));

    // always treat hugest craters as old
    age = craterWidth > 30000.0 ? 0 : i % 3;

    // age-specific tweaks
    rimWeight = uRimWeight * ageMults[age];
    rimWidth = uCraterCut * uRimWidth * ageMults[2 - age];
    rimVariation = uRimVariation * ageMults[2 - age];
    craterDepth = depthToDiameter * craterWidth * ((ageMults[age] + 1.0) / 2.5) * craterPersist;
    // steep should be ~1 for simple craters (else, age-specific)
    steep = craterWidth < 10000.0 ? 1.5 : uCraterSteep * ageMults[age];

    // noise processing
    varNoise = snoise(craterFreq * 8.0 * (p + uSeed));
    cellNoise = cellular(craterFreq * (p + uSeed)) + varNoise * rimVariation;

    // calculate craters and rims from noise functions
    craters = pow((clamp(cellNoise.x, 0.0, uCraterCut) / uCraterCut), steep) - 1.0; // [-1,0]
    craters *= craterDepth * fadeIn;

    rims = (1.0 - smoothstep(uCraterCut, uCraterCut + rimWidth, cellNoise.x)) * rimWeight; // [0,rimWeight]
    rims *= craterDepth * fadeIn;
    
    // apply craters and rims, being thoughtful of overlap
    isSafeInternalCrater = (
      totalCraters < 0.0
      // && lastDistanceFromRim > craterWidth
      // (the below tries to eliminate truncated-internal-craters by only displaying
      // internal craters that do not overlap with the craterWidth-wide space just
      // inside the previous rim (+25%)... if this gets dodgy, the above line is
      // simpler, but does result in the occasional visual artifact... but what doesn't?)
      && lastDistanceFromRim > craterWidth * (uCraterCut + cellNoise.x + 1.25)
    );

    // update totals
    passCraters = isSafeInternalCrater
      ? craters
      : min(0.0, craters - totalCraters);

    totalCraters += passCraters;
    totalRims = isSafeInternalCrater
      ? totalRims + rims
      : max(totalRims, rims);

    // update lastDistanceFromRim only if added craters this pass
    lastDistanceFromRim = passCraters < 0.0
      ? craterWidth * (uCraterCut - cellNoise.x) / uCraterCut
      : lastDistanceFromRim;
  }

  // combine craters and rims
  totalCraters += totalRims;

  // generate some linear features that look like rock cleavage
  float totalCleave = clamp(snoise(p * uSeed * 50.0) * snoise(p), -1.0, uCleaveCut) - uCleaveCut; // [-1.0 - uCleaveCut, 0.0]
  totalCleave *= uCleaveWeight * uMaxCraterDepth;

  // return final
  return (totalCleave < 0.0 ? min(totalCraters, totalCleave) : totalCraters) / uMaxCraterDepth;
}

vec4 getHeight(vec2 flipY, int skipPasses) {
  int modPasses = max(0, uExtraPasses - skipPasses);
  float uCoarseDispFraction = 1.0 - uFineDispFraction;

  // Standardize to unit radius spherical coordinates
  vec3 point = getUnitSphereCoords(flipY);

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