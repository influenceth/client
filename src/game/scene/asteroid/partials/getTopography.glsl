#pragma glslify: cnoise = require('glsl-noise/classic/3d')

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

#pragma glslify: export(getTopography)