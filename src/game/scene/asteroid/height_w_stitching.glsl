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
uniform float uEdgeStrideN;
uniform float uEdgeStrideS;
uniform float uEdgeStrideE;
uniform float uEdgeStrideW;
uniform int uExtraPasses;
uniform float uFeaturesFreq;
uniform float uDispFineWeight;
uniform bool uOversampling;
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

#pragma glslify: getHeight = require('./partials/getHeight', uChunkOffset=uChunkOffset, uChunkSize=uChunkSize, uCleaveCut=uCleaveCut, uCleaveWeight=uCleaveWeight, uCraterCut=uCraterCut, uCraterFalloff=uCraterFalloff, uCraterPasses=uCraterPasses, uCraterPersist=uCraterPersist, uCraterSteep=uCraterSteep, uDispFineWeight=uDispFineWeight, uDispFreq=uDispFreq, uDispPasses=uDispPasses, uDispPersist=uDispPersist, uDispWeight=uDispWeight, uExtraPasses=uExtraPasses, uFeaturesFreq=uFeaturesFreq, uOversampling=uOversampling, uResolution=uResolution, uRimVariation=uRimVariation, uRimWeight=uRimWeight, uRimWidth=uRimWidth, uSeed=uSeed, uStretch=uStretch, uTopoDetail=uTopoDetail, uTopoFreq=uTopoFreq, uTopoWeight=uTopoWeight, uTransform=uTransform)

void main() {
  vec2 flipY = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);

  float oversampleAddOn = uOversampling ? 1.0 : 0.0;
  float edgeDistance = 0.5 + oversampleAddOn;
  float strideX = flipY.y <= edgeDistance
    ? uEdgeStrideS
    : (
      flipY.y >= uResolution.y - edgeDistance
        ? uEdgeStrideN
        : 1.0
    );
  float x = flipY.x - edgeDistance;
  float strideModX = mod(x, strideX);

  float strideY = flipY.x <= edgeDistance
    ? uEdgeStrideW
    : (
      flipY.x >= uResolution.x - edgeDistance
        ? uEdgeStrideE
        : 1.0
    );
  float y = flipY.y - edgeDistance;
  float strideModY = mod(y, strideY);

  float mixAmount = max(strideModX / strideX, strideModY / strideY);

  vec2 point1 = vec2(
    strideModX > 0.0 ? floor(x / strideX) * strideX + edgeDistance : flipY.x,
    strideModY > 0.0 ? floor(y / strideY) * strideY + edgeDistance : flipY.y
  );
  vec4 output1 = getHeight(point1, 0);
  float height1 = (output1.x * 255.0 + output1.y) / 255.0;
  float fineHeight1 = (output1.z * 255.0 + output1.w) / 255.0;

  vec2 point2 = vec2(
    strideModX > 0.0 ? ceil(x / strideX) * strideX + edgeDistance : flipY.x,
    strideModY > 0.0 ? ceil(y / strideY) * strideY + edgeDistance : flipY.y
  );
  vec4 output2 = getHeight(point2, 0);
  float height2 = (output2.x * 255.0 + output2.y) / 255.0;
  float fineHeight2 = (output2.z * 255.0 + output2.w) / 255.0;

  float height = mix(height1, height2, mixAmount);
  float fineHeight = mix(fineHeight1, fineHeight2, mixAmount);

  gl_FragColor = vec4(
    floor(height * 255.0) / 255.0,
    fract(height * 255.0),
    floor(fineHeight * 255.0) / 255.0,
    fract(fineHeight * 255.0)
  );
}
