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
  backgroundStrength: 0.4,
  bloomRadius: 0.6,
  bloomStrength: 0.5,
  enableModelLights: true,
  enablePostprocessing: true,
  enableRevolution: true,
  enableZoomLimits: true,
  envmap: '/textures/model-viewer/forest.hdr',
  envmapStrength: 0.5,
  lightmapStrength: 3,
  spotlightReduction: 150,
  toneMapping: CineonToneMapping,
  toneMappingExposure: 1.6,
};

const visualConfigs = {
  modelViewer: {
    building: {
      ...modelviewerDefaults,
      emissiveAsBloom: true,
      emissiveMapAsLightMap: true,
      envmapStrength: 0.2,
      keylightIntensity: 0,
      lightmapStrength: 5,
      rimlightIntensity: 0.5,

      initialZoom: 0.1,
      maxCameraDistance: 0.2,  // NOTE: use this or simple zoom constraints, not both
      floorNodeName: 'Asteroid_Terrain', // (enforces collision detection with this node (only in y-axis direction))
    },
    resource: {
      ...modelviewerDefaults,
      background: null,
      backgroundStrength: 0,
      keylightIntensity: 1,
      rimlightIntensity: 2,

      initialZoom: 1.5,
      simpleZoomConstraints: [0.85, 5], // TODO: if using simple zoom constraints, should probably not allow panning... maybe all should use maxCameraDistance?
    },
    ship: {
      ...modelviewerDefaults,
      emissiveAsBloom: true,
      keylightIntensity: 1,
      rimlightIntensity: 2,

      simpleZoomConstraints: [0.1, 5],
    },
  },
  scene: {
    backgroundStrength: 0.4,
    bloomRadius: 0.6,
    bloomStrength: 0.5,
    enablePostprocessing: true,
    toneMapping: CineonToneMapping,
    toneMappingExposure: 1.6,
    darklightColor: 'd8ddff',
    darklightStrength: 1,//1.2,//0.1,
    starColor: 'fff7ed',// 0xffeedd,
    starStrength: 3,//1,
  }
};

export default visualConfigs;