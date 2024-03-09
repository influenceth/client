uniform vec3 uCol;
uniform float uTime;
uniform float uCount;
uniform float uAlpha;
varying float vOrder;

void main() {
  float alpha = 1.0 - mod(uTime * 0.1 - vOrder, uCount) / uCount;
  gl_FragColor = vec4(uCol, clamp(alpha, 0.1, uAlpha));
}
