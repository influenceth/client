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
uniform float uFeaturesFreq;
uniform float uDispFineWeight;
uniform vec2 uResolution;
uniform vec3 uSeed;
uniform vec3 uStretch;
uniform float uRimVariation;
uniform float uRimWeight;
uniform float uRimWidth;
uniform int uTopoDetail;
uniform float uTopoFreq;
uniform float uTopoWeight;
uniform mat4 uTransform;

#pragma glslify: getHeight = require('./height_partial', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uCleaveCut=uCleaveCut, uCleaveWeight=uCleaveWeight, uCraterCut=uCraterCut, uCraterFalloff=uCraterFalloff, uCraterPasses=uCraterPasses, uCraterPersist=uCraterPersist, uCraterSteep=uCraterSteep, uDispFreq=uDispFreq, uDispPasses=uDispPasses, uDispPersist=uDispPersist, uDispWeight=uDispWeight, uExtraPasses=uExtraPasses, uFeaturesFreq=uFeaturesFreq, uDispFineWeight=uDispFineWeight, uResolution=uResolution, uSeed=uSeed, uStretch=uStretch, uRimVariation=uRimVariation, uRimWeight=uRimWeight, uRimWidth=uRimWidth, uTopoDetail=uTopoDetail, uTopoFreq=uTopoFreq, uTopoWeight=uTopoWeight, uTransform=uTransform)

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  gl_FragColor = getHeight(flipY, 0);
}
