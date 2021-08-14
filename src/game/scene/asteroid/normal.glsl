uniform sampler2D tHeightmap;
uniform float uNormalIntensity;
uniform vec2 uResolution;

float getHeight(vec2 p) {
  vec2 height16 = texture2D(tHeightmap, p).xy;
  float height = height16.x * 255.0 + height16.y;
  return height / 256.0;
}

void main() {
  // Contract coordinates by 1 pixel on all sides
  vec2 halfRes = uResolution.xy / 2.0;
  vec2 contractionRatio = (uResolution.xy - 2.0) / (uResolution - 1.0);
  vec2 centerCoord = (gl_FragCoord.xy - halfRes) * contractionRatio + halfRes;

  // Sample half a pixel in each direction (normalizing to 0,1)
  vec2 upCoord = (centerCoord + vec2(0.0, 1.0)) / uResolution.xy;
  vec2 downCoord = (centerCoord + vec2(0.0 -1.0)) / uResolution.xy;
  vec2 rightCoord = (centerCoord + vec2(1.0, 0.0)) / uResolution.xy;
  vec2 leftCoord = (centerCoord + vec2(-1.0, 0.0)) / uResolution.xy;

  // Get height at each coordinate
  float up = getHeight(upCoord);
  float down = getHeight(downCoord);
  float right = getHeight(rightCoord);
  float left = getHeight(leftCoord);

  // Calculate X vector
  float xNormal = left - right;
  xNormal = sign(xNormal) * pow(abs(xNormal), uNormalIntensity);
  xNormal = 0.5 * xNormal + 0.5;

  // Calculate Y vector
  float yNormal = down - up;
  yNormal = sign(yNormal) * pow(abs(yNormal), uNormalIntensity);
  yNormal = 0.5 * yNormal + 0.5;

  gl_FragColor = vec4(xNormal, yNormal, 1.0, 1.0);
}
