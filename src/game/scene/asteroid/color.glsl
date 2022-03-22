uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform float uSpectral;
uniform vec2 uResolution;

// TODO: remove edge stuff from this shader
//uniform float uEdgeStrideN;
//uniform float uEdgeStrideS;
//uniform float uEdgeStrideE;
//uniform float uEdgeStrideW;
//uniform float uChunkSize;
//uniform int uSide;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.y = 1.0 - uv.y;

  // Get height from height map and convert to color from ramp
  float height = texture2D(tHeightMap, uv).b;
  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, 1.0 - height));
}
