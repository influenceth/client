uniform vec3 uCol;
uniform float uTime;
uniform float uCount;
uniform bool uDash;
uniform float uAlpha;
uniform float uAlphaMin;
varying float vOrder;

void main() {
  float dashMult = uDash ? mod(floor(vOrder / 4.), 2.) : 1.;
  float alpha = mod(vOrder - uTime * 0.25, uCount) / uCount;
  gl_FragColor = vec4(uCol, dashMult * clamp(alpha, uAlphaMin, uAlpha));
}
