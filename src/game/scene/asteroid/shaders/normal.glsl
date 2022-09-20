#define PI 3.1415926535897932384626433832795
#define SAMPLE_DISTANCE 1.0

uniform sampler2D tHeightMap;
uniform float uChunkWidth;
uniform float uDisplacementScale;
uniform bool uOversampling;
uniform float uResolution;

float getHeight(vec2 fragCoord) {
  vec2 uv = fragCoord / uResolution;
  vec2 height16 = texture2D(tHeightMap, uv).xy;
  return uDisplacementScale * (height16.x * 255.0 + height16.y) / 255.0;
}

void main() {
  // oversampled value from normalmap is not used, so set to edge value to avoid interpolation artifacts
  vec2 flipY = uOversampling
    ? vec2(
      max(1.5, min(gl_FragCoord.x, uResolution - 1.5)),
      max(1.5, min(uResolution - gl_FragCoord.y, uResolution - 1.5))
    )
    : vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);
  
  // Calculate height changes (right - left, above - below)
  float xHeightChange = getHeight(flipY + vec2(SAMPLE_DISTANCE, 0.0)) - getHeight(flipY + vec2(-SAMPLE_DISTANCE, 0.0));
  float yHeightChange = getHeight(flipY + vec2(0.0, SAMPLE_DISTANCE)) - getHeight(flipY + vec2(0.0, -SAMPLE_DISTANCE));

  // calculate angle of normal based on slope of height change
  // NOTE: vec4(0.5, 0.5, 1.0, 1.0) is straight up
  float widthBetweenSamples = 2.0 * SAMPLE_DISTANCE * uChunkWidth / uResolution;
  gl_FragColor = vec4(
    0.5 - atan(xHeightChange / widthBetweenSamples) / PI,
    0.5 - atan(yHeightChange / widthBetweenSamples) / PI,
    1.0,
    1.0
  );
}
