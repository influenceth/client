uniform vec2 uResolution;
uniform vec2 uPoints[400];
uniform int uPointTally;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;

  // default
  gl_FragColor = vec4(0);

  // close to point
  for (int i = 0; i < uPointTally; i++) {
    float dist = distance(uv, uPoints[i]);
    if (dist > 0.008 && dist < 0.012) {
      gl_FragColor = vec4(0.212, 0.718, 0.871, 1);
      break;
    }
  }
}
