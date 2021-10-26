uniform sampler2D tData;
uniform vec2 uResolution;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;

  // default
  gl_FragColor = vec4(0);

  // close to point
  gl_FragColor = texture2D(tData, uv);
}
