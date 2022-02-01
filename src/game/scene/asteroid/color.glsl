uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform float uSpectral;
uniform vec2 uResolution;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;
  //uv.y = 1.0 - uv.y;

  // Get height from topo map and convert to color from ramp
  float height = texture2D(tHeightMap, uv).b;

  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, height));
}
