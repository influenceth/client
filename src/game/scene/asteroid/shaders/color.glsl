uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform int uExtraPasses;
uniform bool uOversampling;
uniform vec2 uResolution;
uniform vec3 uSeed;
uniform float uSpectral;
uniform int uTopoDetail;
uniform float uTopoFreq;
uniform mat4 uTransform;

#pragma glslify: getUnitSphereCoords = require('./partials/getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)
#pragma glslify: getTopography = require('./partials/getTopography', uSeed=uSeed, uTopoFreq=uTopoFreq)

float normalizeNoise(float n) {
  return 0.5 * n + 0.5;
}

void main() {
  vec2 flipY = uOversampling
    ? vec2(
      max(1.5, min(gl_FragCoord.x, uResolution.x - 1.5)),
      max(1.5, min(uResolution.y - gl_FragCoord.y, uResolution.y - 1.5))
    )
    : vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  vec2 height16 = texture2D(tHeightMap, flipY / uResolution).xy;
  float height = (height16.x * 255.0 + height16.y) / 255.0;
  float topo = normalizeNoise(getTopography(getUnitSphereCoords(flipY) * height, uTopoDetail + uExtraPasses));

  // Convert topo to color from ramp
  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, 1.0 - topo));
}
