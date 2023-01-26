uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uResolution;
uniform mat4 uTransform;

uniform float uLowerCutoff;
uniform float uUpperCutoff;
uniform int uOctaves;
uniform float uPers;
uniform float uPointScale;
uniform vec3 uPointShift;

#pragma glslify: getUnitSphereCoords = require('./partials/getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)
#pragma glslify: getAbundance = require('./partials/getAbundance', uLowerCutoff=uLowerCutoff, uUpperCutoff=uUpperCutoff, uOctaves=uOctaves, uPers=uPers, uPointScale=uPointScale, uPointShift=uPointShift)

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);
  vec3 point = getUnitSphereCoords(flipY);
  float abundance = getAbundance(point);
  float transitionWidth = clamp(uChunkSize / 2000000.0, 0.001, 0.02);

  // NOTE: if want to add "border":
  // /4.0 * (smoothstep(0.0, transitionWidth, abundance) - smoothstep(transitionWidth, 3.0 * transitionWidth, abundance))
  abundance = 
    1.5 * smoothstep(0.0001, transitionWidth, abundance)
    + 0.75 * smoothstep(0.2 - transitionWidth, 0.2, abundance)
    + 0.75 * smoothstep(0.4 - transitionWidth, 0.4, abundance)
    + smoothstep(0.6 - transitionWidth, 0.6, abundance)
    + 1.5 * smoothstep(0.8 - transitionWidth, 0.8, abundance);
  abundance /= 5.5; // scale to [0,1] range
  gl_FragColor = vec4(abundance, abundance, abundance, 1.0);
}
