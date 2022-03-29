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
  // (resolution)
  CHUNK_RESOLUTION: 128,      // NOTE: multiplied by 1, 2, 4 (per user's texture settings)
  MIN_CHUNK_SIZE: 2000,
  CHUNK_SPLIT_DISTANCE: 1.25,  // NOTE: this should probably always be >= 0.5 functionally
  OVERSAMPLE_CHUNK_TEXTURES: true,  // NOTE: this probably doesn't need to be a constant; we should always do this
  MODEL_EXPORT_RESOLUTION: 512,

  // (culling, zoom, camera, shadows)
  GEOMETRY_SHRINK: 0.075,       // (multiplied by radius)
  GEOMETRY_SHRINK_MAX: 15000,    // (meters)
  MIN_FRUSTUM_AT_SURFACE: 4000, // closest zoom so that X meters visible w/i frustum height
  ENABLE_CSM: true, // cascading shadow maps
  SHADOWLESS_NORMAL_SCALE: 1.5, // exaggerate normals when shadows are disabled

  // (performance)
  ENABLE_TERRAIN_CHUNK_RESOURCE_POOL: true,
  USE_DEDICATED_GPU_WORKER: false,
  DISABLE_BACKGROUND_TERRAIN_MAPS: typeof OffscreenCanvas === 'undefined',  // force terrain textures to be rendered on main thread
  UPDATE_QUADTREE_EVERY: 0.33, // (multiplied by CHUNK_SPLIT_DISTANCE)

  // Default performance settings
  GRAPHICS_LOW: {
    shadowMode: 0,
    textureQuality: 1
  },
  GRAPHICS_MID: {
    shadowMode: 1,
    shadowSize: 1024,
    textureQuality: 1
  },
  GRAPHICS_HIGH: {
    shadowMode: 2,
    shadowSize: 2048,
    textureQuality: 2
  },
  GRAPHICS_ULTRA: {
    shadowMode: 2,
    shadowSize: 4096,
    textureQuality: 3
  }
};

export default constants;
