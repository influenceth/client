uniform float uMaxRadius;
varying float vRadius;

void main() {
  float alpha = 1.0 - clamp(vRadius / uMaxRadius, 0.0, 1.0);
  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha / 4.0);
}
