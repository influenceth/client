attribute vec3 highlightColor;
varying vec3 vColor;

void main() {
  vColor = highlightColor;
  gl_PointSize = 2.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
