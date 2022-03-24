uniform sampler2D tHeightMap;
uniform float uCompatibilityScalar;
uniform float uNormalIntensity;
uniform bool uOversampling;
uniform vec2 uResolution;

float getHeight(vec2 fragCoord) {
  vec2 uv = fragCoord / uResolution.xy;
  vec2 height16 = texture2D(tHeightMap, uv).zw;
  return (height16.x * 255.0 + height16.y) / 255.0;
}

void main() {
  // oversampled value from normalmap is not used, so set to edge value to avoid interpolation artifacts
  vec2 flipY = uOversampling
    ? vec2(
      max(1.5, min(gl_FragCoord.x, uResolution.x - 1.5)),
      max(1.5, min(uResolution.y - gl_FragCoord.y, uResolution.y - 1.5))
    )
    : vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  //flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  
  float sampleStep = 1.0;

  // Calculate X vector
  float xNormal = getHeight(flipY + vec2(-sampleStep, 0.0)) - getHeight(flipY + vec2(sampleStep, 0.0));
  xNormal *= uCompatibilityScalar;
  xNormal = sign(xNormal) * pow(abs(xNormal), uNormalIntensity);
  xNormal = 0.5 * xNormal + 0.5;

  // Calculate Y vector
  float yNormal = getHeight(flipY + vec2(0.0, -sampleStep)) - getHeight(flipY + vec2(0.0, sampleStep));
  yNormal *= uCompatibilityScalar;
  yNormal = sign(yNormal) * pow(abs(yNormal), uNormalIntensity);
  yNormal = 0.5 * yNormal + 0.5;

  gl_FragColor = vec4(
    xNormal,
    yNormal,
    1.0,
    1.0
  );
}
