uniform sampler2D tHeightMap;
uniform float uCompatibilityScalar;
uniform float uNormalIntensity;
uniform vec2 uResolution;

float getHeight(vec2 p) {
  vec2 height16 = texture2D(tHeightMap, p).xy;
  float height = height16.x * 255.0 + height16.y;
  return height / 256.0;
}

void main() {
  vec2 centerCoord = gl_FragCoord.xy;

  vec2 upCoord = (centerCoord + vec2(0.0, 1.0)) / uResolution.xy;
  vec2 downCoord = (centerCoord + vec2(0.0, -1.0)) / uResolution.xy;
  vec2 rightCoord = (centerCoord + vec2(1.0, 0.0)) / uResolution.xy;
  vec2 leftCoord = (centerCoord + vec2(-1.0, 0.0)) / uResolution.xy;

  // Get height at each coordinate
  float up = getHeight(upCoord);
  float down = getHeight(downCoord);
  float right = getHeight(rightCoord);
  float left = getHeight(leftCoord);

  // attempt to scale normal intensity to previous fixed-resolution intensity
  float xMult = uCompatibilityScalar;
  float yMult = uCompatibilityScalar;

  // samples beyond the edge of the texture will get edge value, but it
  // seems to be smoother to just 2x center-to-sample height change
  // TODO (enhancement): a real fix would be to sample from nearest terrain
  //  chunk OR to render all of our textures with an extra value on each edge
  if (centerCoord.x == 0.5 || centerCoord.x == uResolution.x - 0.5) {
    xMult *= 2.0;
  }
  if (centerCoord.y == 0.5 || centerCoord.y == uResolution.y - 0.5) {
    yMult *= 2.0;
  }

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
