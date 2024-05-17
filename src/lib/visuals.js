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
  bloomRadius: 1,
  bloomStrength: 1,
  enablePostprocessing: true,
  enableModelLights: true,
  enableZoomLimits: true,
  envmap: '/textures/model-viewer/resource_envmap.hdr',
  envmapStrength: 1,
  lightmapStrength: 3,
  spotlightReduction: 150,
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 1,
};

const visualConfigs = {
  modelViewer: {
    building: {
      ...modelviewerDefaults,
      background: '/textures/model-viewer/building_skybox.jpg',
      backgroundStrength: 0.5,
      emissiveAsBloom: true,
      emissiveMapAsLightMap: true,
      enableRevolution: true,
      envmapStrength: 0.2,
      lightmapStrength: 5,
      envmap: '/textures/model-viewer/forest.hdr',
      floorNodeName: 'Asteroid_Terrain', // (enforces collision detection with this node (only in y-axis direction))
      initialZoom: 0.1,
      keylightIntensity: 0.5,
      maxCameraDistance: 0.2,  // NOTE: use this or simple zoom constraints, not both
      rimlightIntensity: 1,
    },
    resource: {
      ...modelviewerDefaults,
      backgroundStrength: 0,
      keylightIntensity: 2,
      rimlightIntensity: 1,
      envmapStrength: 2,
      enablePostprocessing: false,
      enableRotation: true,
      initialZoom: 1.2,
      simpleZoomConstraints: [0.85, 5], // TODO: if using simple zoom constraints, should probably not allow panning... maybe all should use maxCameraDistance?
    },
    ship: {
      ...modelviewerDefaults,
      background: '/textures/model-viewer/building_skybox.jpg',
      backgroundStrength: 0.5,
      emissiveAsBloom: true,
      enableRevolution: true,
      envmap: '/textures/model-viewer/forest.hdr',
      envmapStrength: 1,
      keylightIntensity: 1,
      rimlightIntensity: 2,
      simpleZoomConstraints: [0.1, 5],
    },
  },
  scene: {
    background: null,
    backgroundStrength: 1,
    bloomRadius: 1,
    bloomStrength: 1,
    enablePostprocessing: true,
    toneMapping: ACESFilmicToneMapping,
    toneMappingExposure: 1,
    bloomStrength: 0.8,
    darklightColor: 'd8ddff',
    darklightStrength: 0.75,//1.2,//0.1,
    starColor: 'fffbf6',// 0xffeedd,
    starStrength: 4,//6,//1,
  }
};

export default visualConfigs;