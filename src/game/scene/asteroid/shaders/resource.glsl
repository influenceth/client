uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uResolution;
uniform mat4 uTransform;

uniform float uAbundance;
uniform int uOctaves;
uniform float uPolyParams[8];
uniform float uPolyLimit;
uniform float uPers;
uniform float uPointScale;
uniform vec3 uPointShift;

#pragma glslify: getUnitSphereCoords = require('./partials/getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)
#pragma glslify: getAbundance = require('./partials/getAbundance', uAbundance=uAbundance, uOctaves=uOctaves, uPolyParams=uPolyParams, uPolyLimit=uPolyLimit, uPers=uPers, uPointScale=uPointScale, uPointShift=uPointShift)

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);
  vec3 point = getUnitSphereCoords(flipY);
  float abundance = getAbundance(point);
  float transitionWidth = clamp(uChunkSize / 2000000.0, 0.001, 0.02);

  float abundanceFloor = uAbundance / 2.0;
  float steps = 5.0;
  float stepSize = (1.0 - (abundanceFloor)) / steps;
  abundance =
    1.0
    + step(abundanceFloor + 0.001, abundance)
    + step(abundanceFloor + stepSize, abundance)
    + step(abundanceFloor + stepSize * 2.0, abundance)
    + step(abundanceFloor + stepSize * 3.0, abundance)
    + step(abundanceFloor + stepSize * 4.0, abundance);
  abundance /= steps + 1.0; // scale to [0,1] range
  gl_FragColor = vec4(abundance, abundance, abundance, 1.0);
}
