uniform sampler2D tHeightMap;
uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uCompatibilityScalar;
uniform float uNormalIntensity;
uniform bool uOversampling;
uniform vec2 uResolution;
uniform mat4 uTransform;

// TODO: remove function
vec2 getUnitSpherizedTextCoords(vec2 flipY) {
  // NOTE: this turned out to probably not be as impactful enough to justify its complexity
  // (if use, todo): this needs to only happen at the cube edges (i.e. not between chunks!)
  // (if use, todo): this needs to be replicated in height_w_stitching
    // for oversampling at edges, wrap the edge
    // NOTE: this would have problems if resolution.x and resolution.y were different
    // NOTE: -3.0 == -1.0 (b/c # of faces is # vertexes - 1) + -2.0 (to calculate interval excluding oversampling)
    // float z = uOversampling && (flipY.x == 0.5 || flipY.x == uResolution.x - 0.5 || flipY.y == 0.5 || flipY.y == uResolution.y - 0.5) ? 1.0 - 2.0 / (uResolution.x - 3.0) : 1.0;
    // flipY.x = uOversampling && flipY.x == 0.5 ? 1.5 : flipY.x;
    // flipY.x = uOversampling && flipY.x == uResolution.x - 0.5 ? uResolution.x - 1.5 : flipY.x;
    // flipY.y = uOversampling && flipY.y == 0.5 ? 1.5 : flipY.y;
    // flipY.y = uOversampling && flipY.y == uResolution.y - 0.5 ? uResolution.y - 1.5 : flipY.y;
  float z = 1.0;

  // Standardize to a 2 unit cube centered on origin
  vec2 textCoord = (flipY.xy - (uResolution.xy / 2.0)) / ((uResolution.xy - 1.0) / 2.0);

  // Scale to chunk size and center
  textCoord = textCoord * uChunkSize + uChunkOffset.xy;

  // Calculate the unit vector for each point thereby spherizing the cube
  // (don't need to transform because want relative to texture)
  return normalize(vec3(textCoord, z)).xy;
}

float getHeight(vec2 fragCoord) {
  vec2 uv = fragCoord / uResolution.xy;
  vec2 height16 = texture2D(tHeightMap, uv).xy;
  return (height16.x * 255.0 + height16.y) / 256.0;
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
  
  // Get height at each neighbor coordinate
  float step = 1.0;
  float xHeightChange = getHeight(flipY + vec2(-step, 0.0)) - getHeight(flipY + vec2(step, 0.0));
  float yHeightChange = getHeight(flipY + vec2(0.0, -step)) - getHeight(flipY + vec2(0.0, step));

  // TODO: remove this...
  // NOTE: this also turned out to not be impactful enough for the added complexity
  // calculate xNormal and yNormal components on normalized xy-axis
  //  (this standardizes xNormal and yNormal to an uncurved uv surface)
  //vec2 xDirection = getUnitSpherizedTextCoords(flipY + vec2(-step, 0.0)) - getUnitSpherizedTextCoords(flipY + vec2(step, 0.0));
  //vec2 yDirection = getUnitSpherizedTextCoords(flipY + vec2(0.0, -step)) - getUnitSpherizedTextCoords(flipY + vec2(0.0, step));
  //float xTheta = tan(xDirection.y / xDirection.x);
  //float yTheta = tan(yDirection.x / yDirection.y);
  //float xNormal = xHeightChange * cos(xTheta) + yHeightChange * sin(yTheta);
  //float yNormal = xHeightChange * sin(xTheta) + yHeightChange * cos(yTheta);
  float xNormal = xHeightChange;
  float yNormal = yHeightChange;

  // Calculate X vector
  xNormal *= uCompatibilityScalar;
  xNormal = sign(xNormal) * pow(abs(xNormal), uNormalIntensity);
  xNormal = 0.5 * xNormal + 0.5;

  // Calculate Y vector
  yNormal *= uCompatibilityScalar;
  yNormal = sign(yNormal) * pow(abs(yNormal), uNormalIntensity);
  yNormal = 0.5 * yNormal + 0.5;

  // TODO: this is only relevant at face corners, not all chunk corners
  // NOTE: only relevant if oversampling... otherwise, edges will mismatch anyway
  bool isCorner = uOversampling && (flipY.x == 1.5 || flipY.x == uResolution.x - 1.5) && (flipY.y == 1.5 || flipY.y == uResolution.y - 1.5);
  gl_FragColor = vec4(
    isCorner ? 0.5 : xNormal,
    isCorner ? 0.5 : yNormal,
    1.0,
    1.0
  );
}
