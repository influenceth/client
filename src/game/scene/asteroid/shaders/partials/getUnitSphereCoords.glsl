vec3 getUnitSphereCoords(vec2 flipY) {
  // NOTE: this turned out to probably not be as impactful enough to justify its complexity
  // (if use, todo): this needs to only happen at the cube edges (i.e. not between chunks!)
    // for oversampling at edges, wrap the edge
    // NOTE: this would have problems if resolution.x and resolution.y were different
    // NOTE: -3.0 == -1.0 (b/c # of faces is # vertexes - 1) + -2.0 (to calculate interval excluding oversampling)
    // float z = uOversampling && (flipY.x == 0.5 || flipY.x == uResolution - 0.5 || flipY.y == 0.5 || flipY.y == uResolution - 0.5) ? 1.0 - 2.0 / (uResolution - 3.0) : 1.0;
    // flipY.x = uOversampling && flipY.x == 0.5 ? 1.5 : flipY.x;
    // flipY.x = uOversampling && flipY.x == uResolution - 0.5 ? uResolution - 1.5 : flipY.x;
    // flipY.y = uOversampling && flipY.y == 0.5 ? 1.5 : flipY.y;
    // flipY.y = uOversampling && flipY.y == uResolution - 0.5 ? uResolution - 1.5 : flipY.y;
  float z = 1.0;

  // Standardize to a 2 unit cube centered on origin
  vec2 textCoord = (flipY.xy - (uResolution / 2.0)) / ((uResolution - 1.0) / 2.0);

  // Scale to chunk size and center
  textCoord = textCoord * uChunkSize + uChunkOffset.xy;

  // Calculate the unit vector for each point thereby spherizing the cube
  vec4 transformed = uTransform * vec4(textCoord, z, 0.0);
  return normalize(vec3(transformed.xyz));
}

#pragma glslify: export(getUnitSphereCoords)