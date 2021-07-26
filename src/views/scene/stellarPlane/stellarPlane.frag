uniform float uMaxRadius;
varying float vRadius;

void main() {
  float alpha = 0.75 - clamp(vRadius / uMaxRadius, 0.0, 0.75);
  gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(alpha / 5.0, 0.0, 0.075));
}
