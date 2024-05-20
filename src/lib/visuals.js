import { ACESFilmicToneMapping, AgXToneMapping, CineonToneMapping, LinearToneMapping, NeutralToneMapping, NoToneMapping, ReinhardToneMapping } from 'three';

export const toneMaps = [
  { label: 'NoToneMapping', value: NoToneMapping },
  { label: 'LinearToneMapping', value: LinearToneMapping },
  { label: 'ReinhardToneMapping', value: ReinhardToneMapping },
  { label: 'CineonToneMapping', value: CineonToneMapping },
  { label: 'ACESFilmicToneMapping', value: ACESFilmicToneMapping },
  { label: 'AgXToneMapping', value: AgXToneMapping },
  { label: 'NeutralToneMapping', value: NeutralToneMapping },
];

export const validateHex = (v) => /[a-f0-9]{6}/i.test(v) ? v : '';

const modelviewerDefaults = {
  background: null,
  backgroundStrength: 1,
  bloomRadius: 0.6,
  bloomStrength: 0.5,
  enablePostprocessing: true,
  enableModelLights: true,
  enableZoomLimits: true,
  envmap: '/textures/model-viewer/resource_envmap.hdr',
  envmapStrength: 0.5,
  lightmapStrength: 3,
  spotlightReduction: 150,
  toneMapping: CineonToneMapping,
  toneMappingExposure: 2,
};

const visualConfigs = {
  modelViewer: {
    building: {
      ...modelviewerDefaults,
      background: '/textures/model-viewer/building_skybox.jpg',
      backgroundStrength: 0.4,
      emissiveAsBloom: true,
      emissiveMapAsLightMap: true,
      lightmapStrength: 5,
      envmap: '/textures/model-viewer/forest.hdr',
      envmapStrength: 0.2,
      keylightIntensity: 0,
      rimlightIntensity: 0.5,
      enableRevolution: true,
      initialZoom: 0.1,
      maxCameraDistance: 0.2,  // NOTE: use this or simple zoom constraints, not both
      floorNodeName: 'Asteroid_Terrain', // (enforces collision detection with this node (only in y-axis direction))
    },
    resource: {
      ...modelviewerDefaults,
      backgroundStrength: 0,
      envmap: '/textures/model-viewer/forest.hdr',
      keylightIntensity: 1,
      rimlightIntensity: 2,
      enableRotation: true,
      initialZoom: 1.5,
      simpleZoomConstraints: [0.85, 5], // TODO: if using simple zoom constraints, should probably not allow panning... maybe all should use maxCameraDistance?
    },
    ship: {
      ...modelviewerDefaults,
      background: '/textures/model-viewer/building_skybox.jpg',
      backgroundStrength: 0.4,
      emissiveAsBloom: true,
      envmap: '/textures/model-viewer/forest.hdr',
      keylightIntensity: 1,
      rimlightIntensity: 2,
      enableRevolution: true,
      simpleZoomConstraints: [0.1, 5],
    },
  },
  scene: {
    background: '/textures/model-viewer/building_skybox.jpg',
    backgroundStrength: 0.4,
    bloomRadius: 0.6,
    bloomStrength: 0.5,
    enablePostprocessing: true,
    toneMapping: CineonToneMapping,
    toneMappingExposure: 2,
    darklightColor: 'd8ddff',
    darklightStrength: 0.75,//1.2,//0.1,
    starColor: 'ffeed9',// 0xffeedd,
    starStrength: 3,//6,//1,
  }
};

export default visualConfigs;