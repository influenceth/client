uniform vec2 uChunkOffset;
uniform float uChunkSize;
uniform float uCleaveCut;
uniform float uCleaveWeight;
uniform float uCraterCut;
uniform float uCraterFalloff;
uniform int uCraterPasses;
uniform float uCraterPersist;
uniform float uCraterSteep;
uniform float uDispFreq;
uniform int uDispPasses;
uniform float uDispPersist;
uniform float uDispWeight;
uniform int uExtraPasses;
uniform int uExtraPassesMax;
uniform float uFeaturesFreq;
uniform float uFineDispFraction;
uniform float uLandscapeWidth;
uniform float uMaxCraterDepth;
uniform bool uOversampling;
uniform float uResolution;
uniform float uRimVariation;
uniform float uRimWeight;
uniform float uRimWidth;
uniform vec3 uSeed;
uniform vec3 uStretch;
uniform int uTopoDetail;
uniform float uTopoFreq;
uniform float uTopoWeight;
uniform mat4 uTransform;

#pragma glslify: getHeight = require('./partials/getHeight', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uCleaveCut=uCleaveCut, uCleaveWeight=uCleaveWeight, uCraterCut=uCraterCut, uCraterFalloff=uCraterFalloff, uCraterPasses=uCraterPasses, uCraterPersist=uCraterPersist, uCraterSteep=uCraterSteep, uDispFreq=uDispFreq, uDispPasses=uDispPasses, uDispPersist=uDispPersist, uDispWeight=uDispWeight, uExtraPasses=uExtraPasses, uExtraPassesMax=uExtraPassesMax, uFeaturesFreq=uFeaturesFreq, uFineDispFraction=uFineDispFraction, uLandscapeWidth=uLandscapeWidth, uMaxCraterDepth=uMaxCraterDepth, uOversampling=uOversampling, uResolution=uResolution, uRimVariation=uRimVariation, uRimWeight=uRimWeight, uRimWidth=uRimWidth, uSeed=uSeed, uStretch=uStretch, uTopoDetail=uTopoDetail, uTopoFreq=uTopoFreq, uTopoWeight=uTopoWeight, uTransform=uTransform)

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution - gl_FragCoord.y);
  gl_FragColor = getHeight(flipY, 0);
}
