#define PI 3.1415926535897932384626433832795
#define PRECISE

uniform float uPlotTally;
uniform float uResolution;

uniform float uResource;
uniform vec3 uSeed;

#pragma glslify: getAbundance = require( './partials/getAbundance', uResource=uResource, uSeed=uSeed);

vec3 unitFiboPoint(float index, float pointTally) {
  float y = max(-1.0, min(1.0, 1.0 - 2.0 * (index / (pointTally - 1.0))));
  float radius = sqrt(1.0 - y * y);
  float phi = PI * (3.0 - sqrt(5.0));
  float theta = phi * index;

  return vec3(
    cos(theta) * radius,
    y,
    sin(theta) * radius
  );
}

void main() {
  float tx = gl_FragCoord.x - 0.5;
  float ty = gl_FragCoord.y - 0.5;
  float plotIndex = 4.0 * (ty * uResolution + tx);
  gl_FragColor = vec4(
    getAbundance(unitFiboPoint(plotIndex, uPlotTally)),
    getAbundance(unitFiboPoint(plotIndex + 1.0, uPlotTally)),
    getAbundance(unitFiboPoint(plotIndex + 2.0, uPlotTally)),
    getAbundance(unitFiboPoint(plotIndex + 3.0, uPlotTally))
  );
}
