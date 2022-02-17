uniform sampler2D tHeightMap;
uniform float uCompatibilityScalar;
uniform float uNormalIntensity;
uniform vec2 uResolution;

float getHeight(vec2 fragCoord) {
  vec2 uv = fragCoord / uResolution.xy;
  vec2 height16 = texture2D(tHeightMap, uv).xy;
  float height = (height16.x * 255.0 + height16.y) / 256.0;
  return height;
}

void main() {
  vec2 centerCoord = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  // Get height at each neighbor coordinate
  float up = getHeight(centerCoord + vec2(0.0, 1.0));
  float down = getHeight(centerCoord + vec2(0.0, -1.0));
  float right = getHeight(centerCoord + vec2(1.0, 0.0));
  float left = getHeight(centerCoord + vec2(-1.0, 0.0));

  // attempt to scale normal intensity to previous fixed-resolution intensity
  float xMult = uCompatibilityScalar;
  float yMult = uCompatibilityScalar;

  // Calculate X vector
  float xNormal = (left - right) * xMult;
  xNormal = sign(xNormal) * pow(abs(xNormal), uNormalIntensity);
  xNormal = 0.5 * xNormal + 0.5;

  // Calculate Y vector
  float yNormal = (down - up) * yMult;
  yNormal = sign(yNormal) * pow(abs(yNormal), uNormalIntensity);
  yNormal = 0.5 * yNormal + 0.5;

  gl_FragColor = vec4(xNormal, yNormal, 1.0, 1.0);
}
