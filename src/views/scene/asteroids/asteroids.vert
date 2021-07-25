uniform float uMinSize;
uniform float uMaxSize;
uniform float uMinRadius;
uniform float uMaxRadius;
attribute float radius;
varying vec3 vColor;

void main() {
  vColor = color;
  gl_PointSize = clamp(uMaxSize * pow(abs((radius - uMinRadius) / uMaxRadius), 0.33), uMinSize, uMaxSize);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
