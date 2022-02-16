uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform float uSpectral;
uniform vec2 uResolution;

// TODO: remove edge stuff from this shader
uniform float uEdgeStrideN;
uniform float uEdgeStrideS;
uniform float uEdgeStrideE;
uniform float uEdgeStrideW;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.y = 1.0 - uv.y;

  // Get height from topo map and convert to color from ramp
  vec4 height = texture2D(tHeightMap, uv);
  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, height.b));

  vec2 flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  if (flipY.x == 0.5) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  } else if (flipY.y == 0.5 || flipY.y == uResolution.y - 0.5 || flipY.x == uResolution.x - 0.5) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
}
