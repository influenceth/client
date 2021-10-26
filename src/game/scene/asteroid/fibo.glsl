uniform vec2 uResolution;
uniform int uIndices[500];
uniform vec2 uPoints[500];
uniform int uPointTally;

void main() {
  // Reduce by resolution
  vec2 uv = gl_FragCoord.xy / uResolution;

  // default
  gl_FragColor = vec4(0);

  // close to point
  for (int i = 0; i < uPointTally; i++) {
    float dist = distance(uv, uPoints[i]);
    if (dist < 0.020) {
      if (dist > 0.015) {
        //gl_FragColor = vec4(0.212, 0.718, 0.871, 1);
        gl_FragColor = vec4(0.0, 1.0-float(uIndices[i])/650.0, float(uIndices[i])/650.0, 1.0);
      }
      break;
    }
  }
}
