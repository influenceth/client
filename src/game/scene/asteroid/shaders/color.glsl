uniform sampler2D tHeightMap;
uniform sampler2D tRamps;
uniform bool uOversampling;
uniform float uResolution;
uniform float uSpectral;
// uniform int uSide;

void main() {
  vec2 flipY = uOversampling
    ? vec2(
      max(1.5, min(gl_FragCoord.x, uResolution - 1.5)),
      max(1.5, min(uResolution - gl_FragCoord.y, uResolution - 1.5))
    )
    : vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);

  // get topo from height map
  float topo = texture2D(tHeightMap, flipY / uResolution).z;

  // Convert topo to color from ramp
  gl_FragColor = texture2D(tRamps, vec2((uSpectral + 0.5) / 11.0, 1.0 - topo));
  // if (uSide > 1) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  // if (flipY.x < 5.0) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  // if (flipY.y < 5.0) gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
