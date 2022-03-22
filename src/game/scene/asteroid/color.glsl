uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform bool uOversampling;
uniform vec2 uResolution;
uniform vec3 uSeed;
//uniform int uSide;
uniform float uSpectral;
uniform int uTopoDetail;
uniform float uTopoFreq;
uniform mat4 uTransform;

#pragma glslify: cnoise = require('glsl-noise/classic/3d')

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

float getTopography(vec3 p) {
  p = p * uTopoFreq + uSeed;
  float topo = recursiveCNoise(p, uTopoDetail);
  float uniformNoise = fract(sin(dot(p.xy, vec2(12.9898,78.233))) * 43758.5453);
  float noiseWeight = 0.005;
  return ((1.0 - noiseWeight) * topo) + (noiseWeight * uniformNoise);
}

void main() {

  // oversampled value from colormap is not used, so set to edge value to avoid interpolation artifacts
  vec2 flipY = uOversampling
    ? vec2(
      max(1.5, min(gl_FragCoord.x, uResolution.x - 1.5)),
      max(1.5, min(uResolution.y - gl_FragCoord.y, uResolution.y - 1.5))
    )
    : vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  // Get height from topo map and convert to color from ramp
  vec2 height16 = texture2D(tHeightMap, flipY / uResolution).xy;
  float height = (height16.x * 255.0 + height16.y) / 256.0;
  float topo = getTopography(getUnitSphereCoords(flipY) * height);

  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, 1.0 - topo));
}
