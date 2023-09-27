uniform vec3 uCol;
uniform float uTime;
uniform float uCount;
uniform bool uDash;
uniform float uAlpha;
uniform float uAlphaMin;
varying float vOrder;

void main() {
  float alpha = uDash
    ? mod(floor((vOrder - uTime * 0.05) / 4.), 2.)
    : mod(vOrder - uTime * 0.25, uCount) / uCount;
  gl_FragColor = vec4(uCol, clamp(alpha, uAlphaMin, uAlpha));
}
