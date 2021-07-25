uniform vec3 uCol;
uniform float uTime;
uniform vec3 uStart;
uniform vec3 uEnd;
varying vec3 vPosition;

void main() {
  float tenthAu = 14959787070.0;
  float intensity = abs(mod(distance(uStart, vPosition) - (uTime * 100000000.0), tenthAu) / tenthAu);
  // float alpha = uAlpha * mod(vOrder - uTime, uCount) / uCount;
  gl_FragColor = vec4(uCol, clamp(intensity, 0.33, 1.0));
}
