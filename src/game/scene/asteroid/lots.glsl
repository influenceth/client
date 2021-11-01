varying vec3 vPosition;

uniform vec3 uMouse;
uniform bool uMouseIn;
uniform float uMouseRadius;
uniform vec3 uNearbyLots[40];
uniform float uRadius;

struct NearbyLot {
  int index;
  float distance;
};

void updateClosestLots(inout NearbyLot closest[2], vec3 testPosition) {
  for (int i = 0; i < 40; i++) {
    if (length(uNearbyLots[i]) > 0.0) {
      float testDist = distance(testPosition, uNearbyLots[i]);
      if (closest[0].distance < 0.0 || testDist < closest[0].distance) {
        closest[1] = closest[0];
        closest[0].index = i;
        closest[0].distance = testDist;
      } else if (closest[1].distance < 0.0 || testDist < closest[1].distance) {
        closest[1].index = i;
        closest[1].distance = testDist;
      }
    }
  }
}

vec4 outlineByClosest(float mDist, vec3 uv) {
  NearbyLot lots[2] = NearbyLot[2](
    NearbyLot(-1, -1.0),
    NearbyLot(-1, -1.0)
  );

  updateClosestLots(lots, uv);
  if (false && lots[0].distance < 0.02) {
    return vec4(1.0);
  }
    
  float minMouseRadius = 0.5 * uMouseRadius;
  float maxMouseRadius = 0.85 * uMouseRadius;

  float alphaMax = 0.8 - (clamp(mDist, minMouseRadius, maxMouseRadius) - minMouseRadius) / (maxMouseRadius - minMouseRadius);

  float lineWidth = 75.0 / uRadius;

  // if near border between tiles, color as line
  float distanceFromNextLot = lots[1].distance - lots[0].distance;
  if (distanceFromNextLot < lineWidth) {
    if (lots[0].index == 0) {
      return vec4(0.21, 0.65, 0.8, 0.8);
    }
    float fade = min(1.0, pow((uRadius / 100.0) * distanceFromNextLot, 2.0) + 0.3);
    return vec4(0.0, 0.0, 1.0, min(alphaMax, 1.0) * fade);

  // if nearest mouse tile, color as highlighted
  } else if (lots[0].index == 0) {
    return vec4(0.4, 0.4, 1.0, 0.2);
  }

  return vec4(0.0);
}

void main() {
  gl_FragColor = vec4(0.0);
  if (uMouseIn) {
    vec3 p = normalize(vPosition);
    vec3 m = normalize(uMouse);
    float mDist = distance(p, m);
    if (mDist < uMouseRadius) {
      gl_FragColor = outlineByClosest(mDist, p);
    }
  }
}