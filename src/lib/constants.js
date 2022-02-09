const constants = {
  AU: 149597870700, // in meters
  MAX_SYSTEM_RADIUS: 10, // in AU
  MAX_ASTEROID_RADIUS: 376000, // in meters
  MIN_ASTEROID_RADIUS: 1000, // in meters
  MAX_AXIS: 4.0, // Maximum semi-major axis in AU
  MIN_AXIS: 0.8, // Minimum semi-major axis in AU
  MIN_INCLINATION: 0,
  MAX_INCLINATION: 40,
  MIN_ECCENTRICITY: 0,
  MAX_ECCENTRICITY: 0.4,
  STAR_INTENSITY: 1, // as it relates to THREE light

  // Asteroid settings
  CHUNK_RESOLUTION: 64,
  ENABLE_TERRAIN_CHUNK_MULTITHREADING: false, // true is actually seemingly less performant b/c GPU
  ENABLE_TERRAIN_CHUNK_RESOURCE_POOL: false,
  GEOMETRY_SHRINK: 0.05,       // (multiplied by radius)
  GEOMETRY_SHRINK_MAX: 1000,  // meters
  MIN_CHUNK_SIZE: 400,
  MIN_FRUSTRUM_HEIGHT: 2000,
  UPDATE_QUADTREE_EVERY_CHUNK: 0.5, // (multiplied by MIN_CHUNK_SIZE)
  QUADTREE_SPLIT_DISTANCE: 1.25,

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
