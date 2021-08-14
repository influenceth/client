uniform vec3 uCol;
uniform float uTime;
uniform vec3 uStart;
varying vec3 vPosition;

void main() {
  float segmentDist = 149597870700.0;
  float intensity = abs(mod(distance(uStart, vPosition) - (uTime * 1000000000.0), segmentDist) / segmentDist);
  gl_FragColor = vec4(uCol, clamp(intensity, 0.5, 1.0));
}
