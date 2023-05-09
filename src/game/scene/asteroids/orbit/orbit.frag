uniform vec3 uCol;
uniform float uTime;
uniform float uCount;
uniform float uAlpha;
uniform float uAlphaMin;
varying float vOrder;

void main() {
  float alpha = uAlpha * mod(vOrder - uTime * 0.25, uCount) / uCount;
  gl_FragColor = vec4(uCol, clamp(alpha, uAlphaMin, 1.0));
}
