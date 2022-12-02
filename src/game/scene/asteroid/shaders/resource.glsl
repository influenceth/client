#define LINE_INTENSITY 0.75
#define LINE_THICKNESS 0.012

uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uResolution;
uniform mat4 uTransform;

uniform float uResource;
uniform vec3 uSeed;

#pragma glslify: getUnitSphereCoords = require('./partials/getUnitSphereCoords', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uResolution=uResolution, uTransform=uTransform)
#pragma glslify: getAbundance = require( './partials/getAbundance', uResource=uResource, uSeed=uSeed)

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);
  vec3 point = getUnitSphereCoords(flipY);
  float abundance = getAbundance(point);

  // turn into heatmap...
  float LINE_START = 0.2 - 0.5 * LINE_THICKNESS;

  // [0, 4 + LINE_INTENSITY]
  // TODO: the smooth size should be smaller the more zoomed in to avoid "blurry" look
  //  (i.e. could relate to chunksize)
  abundance = smoothstep(0.19, 0.2, abundance)
    // NOTE: can simulate lines around outer edge with something like this:
    + LINE_INTENSITY * (
      smoothstep(LINE_START, LINE_START + 0.75 * LINE_THICKNESS, abundance)
      - smoothstep(LINE_START + 0.5 * LINE_THICKNESS, LINE_START + LINE_THICKNESS, abundance)
    )
    + smoothstep(0.39, 0.4, abundance)
    + smoothstep(0.59, 0.6, abundance)
    + smoothstep(0.79, 0.8, abundance);
  // [0, 1]
  abundance /= (4.0 + LINE_INTENSITY);

  gl_FragColor = vec4(abundance, abundance, abundance, 0.5);
}
