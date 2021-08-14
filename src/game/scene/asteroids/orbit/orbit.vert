attribute float order;
varying float vOrder;

void main() {
  vOrder = order;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
