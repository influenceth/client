varying float vRadius;

void main() {
  vRadius = distance(position, vec3(0, 0, 0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
