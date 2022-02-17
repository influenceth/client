uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform float uSpectral;
uniform vec2 uResolution;

// TODO: remove edge stuff from this shader
uniform float uEdgeStrideN;
uniform float uEdgeStrideS;
uniform float uEdgeStrideE;
uniform float uEdgeStrideW;
uniform float uChunkSize;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.y = 1.0 - uv.y;

  // Get height from topo map and convert to color from ramp
  vec4 height = texture2D(tHeightMap, uv);
  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, height.b));
  return;

  // TODO: remove debug
  vec2 flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  float uOversample = 1.0;
  float edgeDistance = 0.5 + uOversample;
  float strideX = flipY.y <= edgeDistance
    ? uEdgeStrideS
    : (
      flipY.y >= uResolution.y - edgeDistance
        ? uEdgeStrideN
        : 1.0
    );
  float x = flipY.x - edgeDistance;
  float strideModX = mod(x, strideX);

  float strideY = flipY.x <= edgeDistance
    ? uEdgeStrideW
    : (
      flipY.x >= uResolution.x - edgeDistance
        ? uEdgeStrideE
        : 1.0
    );
  float y = flipY.y - edgeDistance;
  float strideModY = mod(y, strideY);

  float mixAmount = max(strideModX / strideX, strideModY / strideY);
  if (mixAmount > 0.0) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
}
