uniform vec3 uCol;
uniform float uTime;
uniform float uCount;
uniform float uAlpha;
varying float vOrder;

void main() {
  float alpha = uAlpha * mod(vOrder - uTime * 0.25, uCount) / uCount;
  gl_FragColor = vec4(uCol, clamp(alpha, 0.5, 1.0));
}
