const constants = {
  AU: 149597870700, // in meters
  MAX_SYSTEM_RADIUS: 10, // in AU
  MAX_ASTEROID_RADIUS: 376000, // in meters
  MIN_ASTEROID_RADIUS: 1000, // in meters
  MAX_AXIS: 4.0, // Maximum semi-major axis in AU
  MIN_AXIS: 0.8, // Minimum semi-major axis in AU
  STAR_INTENSITY: 2, // as it relates to THREE light

  // Performance settings
  GRAPHICS_LOW: {
    shadows: false,
    textureSize: 512
  },
  GRAPHICS_MID: {
    shadows: true,
    shadowSize: 1024,
    textureSize: 512
  },
  GRAPHICS_HIGH: {
    shadows: true,
    shadowSize: 2048,
    textureSize: 1024
  },
  GRAPHICS_ULTRA: {
    shadows: true,
    shadowSize: 4096,
    textureSize: 2048
  }
};

export default constants;
