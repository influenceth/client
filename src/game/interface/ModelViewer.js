import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationMixer, Box3, Color, DirectionalLight, EquirectangularReflectionMapping, LoopRepeat, PCFSoftShadowMap, Raycaster, Vector2, Vector3 } from 'three';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { useLocation, useParams } from 'react-router-dom';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import Button from '~/components/Button';
import Details from '~/components/DetailsFullsize';
import Dropdown from '~/components/Dropdown';
import NumberInput from '~/components/NumberInput';
import Postprocessor from '../Postprocessor';
import useStore from '~/hooks/useStore';

// TODO: connect to gpu-graphics settings?
const ENABLE_SHADOWS = true;
const ENV_MAP_STRENGTH = 4.5;
const DOWN = new Vector3(0, -1, 0);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const CanvasContainer = styled.div`
  height: 100%;
  opacity: ${p => p.ready ? 1 : 0};
  transition: opacity 250ms ease;
  width: 100%;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 100%;
    max-height: none;
    max-width: none;
    width: 100%;
  }
`;

const Miniform = styled.div`
  display: block !important;
  margin-top: 15px;
  padding-left: 5px;
  width: 175px;
  & > label {
    display: block;
    font-size: 10px;
  }
  & > input {
    width: 100%;
  }
`;

const Devtools = styled.div`
  display: flex;
  flex-direction: column;
  left: 32px;
  position: absolute;
  top: 108px;
  z-index: 2;

  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    margin-top: 15px;
    & > button {
      margin: 0;
    }
    & > span {
      cursor: ${p => p.theme.cursors.active};
      font-size: 10px;
      padding-left: 10px;
      &:hover {
        opacity: 0.7;
      }
    }
  }

  @media (max-width: 800px) {
    display: none;
  }
`;

const Dropdowns = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  left: 32px;
  position: absolute;
  top: 60px;
  z-index: 3;
  & > * {
    margin-bottom: 2px;
    margin-right: 10px;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    left: 20px;
  }
`;

const IconContainer = styled.div`
  background: black;
  border: 1px solid rgba(255, 255, 255, 0.25);
  bottom: 105px;
  left: 32px;
  height: 115px;
  position: absolute;
  width: 115px;
  z-index: 2;
  & > img {
    max-height: 100%;
    width: 100%;
  }

  @media (max-width: 600px) {
    display: none;
  }
`;

const loadingCss = css`
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 10;
`;

const skyboxDefaults = {
  'Resource': {
    background: '/textures/model-viewer/resource_skybox.hdr',
    envmap: '/textures/model-viewer/resource_envmap.hdr',
  },
  'Building': {
    background: '/textures/model-viewer/building_skybox.jpg',
    envmap: '/textures/model-viewer/resource_envmap.hdr',
  }
};

const Model = ({ assetType, url, onLoaded, overrideEnvStrength, rotationEnabled, zoomLimitsEnabled }) => {
  const { camera, clock, gl, scene } = useThree();

  // if three is started with frameloop == 'never', clock is not set to autoStart, so we need to set it
  useEffect(() => {
    if (clock && !clock.autoStart) clock.autoStart = true;
  }, []);

  const animationMixer = useRef();
  const maxCameraDistance = useRef();
  const controls = useRef();
  const model = useRef();

  const asteroidTerrain = useRef();
  const raycaster = useRef(new Raycaster());

  // init the camera (reset when url changes)
  useEffect(() => {
    // TODO (enhancement): on mobile, aspect ratio is such that zoomed out to 1 may not have
    //  view of full width of 1.0 at 0,0,0... so on mobile, should probably set this to 1.5+
    const zoom = assetType === 'Building' ? 0.2 : 1.75;
    camera.position.set(0, 0.75 * zoom, 1.25 * zoom);
    camera.up.set(0, 1, 0);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.update();
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  // init orbitcontrols
  useEffect(() => {
    controls.current = new OrbitControls(camera, gl.domElement);
    controls.current.target.set(0, 0, 0);
    controls.current.zoomSpeed = 0.33;

    controls.current.object.near = 0.001;
    controls.current.object.updateProjectionMatrix();

    return () => {
      controls.current.dispose();
    };
  }, [camera, gl]);

  useEffect(() => {
    if (assetType === 'Resource' && zoomLimitsEnabled) {
      controls.current.minDistance = 0.85;
      controls.current.maxDistance = 5;
    } else {
      controls.current.minDistance = 0;
      controls.current.maxDistance = Infinity;
    }
  }, [assetType, zoomLimitsEnabled]);

  // // init axeshelper
  // useEffect(() => {
  //   const axesHelper = new THREE.AxesHelper(5);
  //   scene.add(axesHelper);
  //   return () => {
  //     scene.remove(axesHelper);
  //   };
  // }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // const box3h = useRef();

  // load the model on url change
  useEffect(() => {
    if (model.current) scene.remove(model.current);
    // if (box3h.current) {
    //   box3h.current.removeFromParent();
    // }
    
    const helpers = [];

    // load the model
    loader.load(
      url,

      // onload
      function (gltf) {
        let predefinedCenter;
        let predefinedCamera;

        const removeNodes = [];
        model.current = gltf.scene || gltf.scenes[0];
        model.current.traverse(function (node) {
          node.receiveShadow = true;
          if (node.name === 'Center') {
            predefinedCenter = node.position.clone();
          } else if (node.name === 'Camera') {
            predefinedCamera = node.position.clone();
          } else if (node.isMesh) {
            if (node.name === 'Asteroid_Terrain') {
              asteroidTerrain.current = node;
            }

            // self-shadowing
            if (ENABLE_SHADOWS) {
              node.castShadow = true;
              node.receiveShadow = true;
            }

            // env-map intensity
            if (node.material?.envMapIntensity) {
              node.material.envMapIntensity = ENV_MAP_STRENGTH;
            }
            if (assetType === 'Building') {
              node.material.envMapIntensity = 0;
              if (node.material?.emissiveMap) {
                if (node.material.lightMap) console.warn('LIGHTMAP overwritten by emissiveMap', node);

                node.material.lightMap = node.material.emissiveMap;
                node.material.emissive = new Color(0x0);
                node.material.emissiveMap = null;
              }

              // TODO: should tag this surface in the userData rather than matching by name
              // if (node.name === 'Asteroid001') {
              //   node.castShadow = false;
              // }
            }

            // only worry about depth on non-transparent materials
            // (from https://github.com/donmccurdy/three-gltf-viewer/blob/main/src/viewer.js)
            node.material.depthWrite = !node.material.transparent;
          } else if (assetType === 'Building' && node.isSpotLight) {
            node.castShadow = true;
            node.shadow.bias = -0.0001;
            node.intensity /= 8;
          } else if (node.isLight) {
            console.warn(`unexpected light (${node.type}) removed: `, node.name);
            removeNodes.push(node);
          }

          // disable frustum culling because several of the models have some issues with the
          // animated parts getting culled even when still visible
          // TODO (enhancement): could potentially try applying this just to animated objects?
          node.frustumCulled = false;
        });
        removeNodes.forEach((node) => node.removeFromParent());

        // resize
        //  (assuming rotating around y, then make sure max x-z dimensions
        //   fit inside 1 and y-height fit inside 1)
        const bbox = new Box3().setFromObject(model.current);
        // const crossVector = new Vector3();
        // crossVector.subVectors(
        //   new Vector3(bbox.max.x, 0, bbox.max.z),
        //   new Vector3(bbox.min.x, 0, bbox.min.z),
        // );
        // const height = bbox.max.y - bbox.min.y;
        // const scaleValue = 1.0 / Math.max(height, crossVector.length());
        const scaleValue = 1.0 / Math.max(
          bbox.max.x - bbox.min.x,
          bbox.max.y - bbox.min.y,
          bbox.max.z - bbox.min.z
        );
        model.current.scale.set(scaleValue, scaleValue, scaleValue);

        // resize shadow cameras (these don't automatically resize with the rest of the model)
        model.current.traverse(function (node) {
          if (node.isSpotLight) {
            // NOTE: if near and far are able to be set by blender / exported into the glb (it seems they are not)
            //  we would *= the near and far by scaleValue here instead
            node.shadow.camera.near = 0.00001;
            node.shadow.camera.far = 1;
            node.shadow.camera.fov = 180 * (2 * node.angle / Math.PI);
            node.shadow.mapSize = new Vector2(1024, 1024);
            node.shadow.camera.updateProjectionMatrix();
            
            // const cameraHelper = new THREE.CameraHelper(node.shadow.camera);
            // helpers.push(cameraHelper);
          }
        });

        // reposition (to put center at origin or predefined point)
        let center;
        if (predefinedCenter) {
          center = predefinedCenter.clone().setLength(predefinedCenter.length() * scaleValue);
        } else {
          bbox.setFromObject(model.current);
          center = bbox.getCenter(new Vector3());
        }
        model.current.position.x += model.current.position.x - center.x;
        model.current.position.y += model.current.position.y - center.y;
        model.current.position.z += model.current.position.z - center.z;

        // if camera is predefined, position camera accordingly
        if (predefinedCamera) {
          const cam = predefinedCamera.clone().setLength(predefinedCamera.length() * scaleValue);
          controls.current.object.position.set(
            cam.x + model.current.position.x,
            cam.y + model.current.position.y,
            cam.z + model.current.position.z
          );
          controls.current.update();
        }

        if (assetType === 'Building') {
          // maxCameraDistance.current = 2 * controls.current.object.position.length();
          maxCameraDistance.current = 0.1;
        }

        // bbox.setFromObject(model.current);
        // helpers.push(new THREE.Box3Helper(bbox));

        // initial rotation simulates initial camera position in blender
        // (halfway between the x and z axis)
        // model.current.rotation.y = -Math.PI / 4;
      
        // add to scene and report as loaded
        scene.add(model.current);
        helpers.forEach((helper) => scene.add(helper));

        // init animation mixer
        if (gltf.animations?.length > 0) {
          animationMixer.current = new AnimationMixer(model.current);
          gltf.animations.forEach((action) => {
            const clip = animationMixer.current.clipAction(action);
            clip.setLoop(LoopRepeat);
            clip.play();
          });
        }

        onLoaded(true);
      },

      // onprogress
      // TODO (enhancement): share the below with user
      (xhr) => {
        // console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },

      // onerror
      (error) => {
        console.error(error);
        onLoaded(false);
      }
    );

    // (clean-up)
    return () => {
      if (model.current) scene.remove(model.current);
      (helpers || []).forEach((helper) => scene.add(helper));
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLoaded, url]);

  useEffect(() => {
    if (!model.current) return;
    model.current.traverse(function (node) {
      if (node.isMesh) {
        if (node.material?.envMapIntensity) {
          node.material.envMapIntensity = overrideEnvStrength || 3.0;
        }
      }
    });
  }, [overrideEnvStrength]);

  useFrame((state, delta) => {
    if (model.current && rotationEnabled) {
      model.current.rotation.y += 0.0025;
      // if (box3h.current) {
      //   box3h.current.rotation.y += 0.0025;
      // }
    }
    if (animationMixer.current) {
      animationMixer.current.update(delta);
    }

    // apply camera constraints to building scene
    if (assetType === 'Building') {
      if (controls.current.object && controls.current.target) {
        let updateControls = false;

        // collision detection on asteroid terrain
        if (asteroidTerrain.current) {
          raycaster.current.set(
            new Vector3(
              controls.current.object.position.x,
              1,
              controls.current.object.position.z,
            ),
            DOWN
          );
          const intercepts = raycaster.current.intersectObject(asteroidTerrain.current, false);
          if (intercepts.length > 0) {
            if (intercepts[0].point.y + 0.001 > controls.current.object.position.y) {
              controls.current.object.position.set(
                controls.current.object.position.x,
                intercepts[0].point.y + 0.001001,
                controls.current.object.position.z,
              );
              updateControls = true;
            }
          }
        }

        if (zoomLimitsEnabled && maxCameraDistance.current !== null) {
          // don't let camera beyond distance (if defined)
          if (controls.current.object.position.length() > maxCameraDistance.current) {
            controls.current.object.position.setLength(maxCameraDistance.current);
            updateControls = true;
          }
          // don't let target beyond third of distance (to make sure generally stay facing model)
          if (controls.current.target.length() > maxCameraDistance.current * 0.33) {
            controls.current.target.setLength(maxCameraDistance.current * 0.33);
            updateControls = true;
          }
        }
        if (updateControls) {
          controls.current.update();
        }
      }
    }
  });

  return null;
  // return (
  //   <mesh>
  //     <boxGeometry args={[1, 1, 1]} />
  //     <meshStandardMaterial color="orange" opacity={0.2} transparent />
  //   </mesh>
  // );
}

const loadTexture = (file, filename = '') => {
  return new Promise((resolve) => {
    if (/\.hdr$/i.test(filename || file || '')) {
      new RGBELoader().load(file, resolve);
    } else {
      new THREE.TextureLoader().load(file, resolve);
    }
  })
};

const Skybox = ({ assetType, onLoaded, overrideBackground, overrideBackgroundName, overrideEnvironment, overrideEnvironmentName }) => {
  const { scene } = useThree();

  useEffect(() => {
    let cleanupTextures = [];

    let background = overrideBackground || skyboxDefaults[assetType].background;
    let env = overrideEnvironment || skyboxDefaults[assetType].envmap;

    let waitingOn = background === env ? 1 : 2;
    loadTexture(background, overrideBackgroundName).then(function (texture) {
      cleanupTextures.push(texture);
      texture.mapping = EquirectangularReflectionMapping;
      scene.background = texture;
      if (background === env) {
        scene.environment = texture;
      }

      waitingOn--;
      if (waitingOn === 0) onLoaded();
    });
    if (background !== env) {
      loadTexture(env, overrideEnvironmentName).then(function (texture) {
        cleanupTextures.push(texture);
        texture.mapping = EquirectangularReflectionMapping;
        scene.environment = texture;

        waitingOn--;
        if (waitingOn === 0) onLoaded();
      });
    }

    return () => {
      cleanupTextures.forEach((t) => t.dispose());
    };
  }, [assetType, overrideBackground, overrideEnvironment]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const Lighting = ({ assetType }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const keyLight = new DirectionalLight(0xFFFFFF);
    keyLight.castShadow = true;
    keyLight.intensity = 1.0;
    if (assetType === 'Building') {
      keyLight.intensity = 0;//0.1;
    }
    keyLight.position.set(-2, 2, 2);
    // keyLight.position.set(0, 2, 0);
    scene.add(keyLight);

    const rimLight = new DirectionalLight(0x9ECFFF);
    rimLight.intensity = 0.25;
    rimLight.position.set(4, 2, 4);
    scene.add(rimLight);

    if (ENABLE_SHADOWS) {
      gl.shadowMap.enabled = true;
      // gl.shadowMap.type = PCFSoftShadowMap;

      keyLight.castShadow = true;
      keyLight.shadow.camera.near = 2.75;
      keyLight.shadow.camera.far = 4.25;
      keyLight.shadow.camera.bottom = keyLight.shadow.camera.left = -0.75;
      keyLight.shadow.camera.right = keyLight.shadow.camera.top = 0.75;
      if (assetType === 'Building') {
        keyLight.shadow.camera.bottom = keyLight.shadow.camera.left = -0.075;
        keyLight.shadow.camera.right = keyLight.shadow.camera.top = 0.075;
      }
      // keyLight.shadow.camera.near = 1.75;
      // keyLight.shadow.camera.far = 2.25;
      // keyLight.shadow.camera.bottom = keyLight.shadow.camera.left = -0.15;
      // keyLight.shadow.camera.right = keyLight.shadow.camera.top = 0.15;
      keyLight.shadow.camera.updateProjectionMatrix();
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.mapSize.width = 1024;
      // keyLight.shadow.bias = -0.02;
    }

    // const spotlightFOV = Math.PI / 2.3;
    // const spotlightTilt = 0.006;
    // const spotlights = [
    //   new THREE.SpotLight(0xffffff, 0, 1, spotlightFOV, 1.0),
    //   new THREE.SpotLight(0xffffff, 1, 1, spotlightFOV, 1.0)
    // ];
    // if (spotlights[0]) {
    //   spotlights[0].position.set(-0.0095, 0.0535, 0.005);
    //   spotlights[0].target.position.set(spotlights[0].position.x, spotlights[0].position.y - 0.01, spotlights[0].position.z);

    //   // spotlights[0].position.set(-0.007, 0.055, 0.005);
    //   // spotlights[0].target.position.set(spotlights[0].position.x - spotlightTilt, spotlights[0].position.y - 0.01, spotlights[0].position.z);

    //   // spotlights[0].position.set(-0.0095, 0.055, 0.0075);
    //   // spotlights[0].target.position.set(spotlights[0].position.x, spotlights[0].position.y - 0.01, spotlights[0].position.z - spotlightTilt);
    // }
    // if (spotlights[1]) {
    //   spotlights[1].position.set(-0.012, 0.055, 0.005);
    //   spotlights[1].target.position.set(spotlights[1].position.x + spotlightTilt, spotlights[1].position.y - 0.01, spotlights[1].position.z);

    //   // spotlights[1].position.set(-0.0095, 0.055, 0.0025);
    //   // spotlights[1].target.position.set(spotlights[1].position.x, spotlights[1].position.y - 0.01, spotlights[1].position.z + spotlightTilt);

    //   spotlights[1].position.set(-0.0012, 0.045, 0.005);
    //   spotlights[1].target.position.set(-0.01, 0.040, 0.005);
    // }

    // const helpers = [];

    // spotlights.forEach((spotlight, i) => {
    //   spotlight.castShadow = true;

    //   scene.add(spotlight);
    //   scene.add(spotlight.target);

    //   spotlight.shadow.bias = -0.01;
    //   spotlight.shadow.mapSize.height = 1024;
    //   spotlight.shadow.mapSize.width = 1024;

    //   spotlight.shadow.camera.near = 0.0025;
    //   spotlight.shadow.camera.far = 0.01;
    //   spotlight.shadow.camera.fov = 180 * (2 * spotlightFOV);
    //   spotlight.shadow.camera.updateProjectionMatrix();
      
    //   if (i === 1) {
    //     // helpers.push(new THREE.SpotLightHelper(spotlight));
    //     helpers.push(new THREE.CameraHelper(spotlight.shadow.camera));
    //   }
    // })
    // helpers.forEach((helper) => {
    //   scene.add(helper);
    // });

    // const helper1 = new THREE.CameraHelper( keyLight.shadow.camera );
    // scene.add(helper1);
    // const helper2 = new THREE.DirectionalLightHelper(keyLight);
    // scene.add(helper2);
    // const helper3 = new THREE.CameraHelper(keyLight.shadow.camera);
    // scene.add(helper3);
    // const helper4 = new THREE.Mesh(
    //   new THREE.BoxGeometry(0.005, 0.005, 0.005),
    //   new THREE.MeshPhysicalMaterial({ color: 0xff0000 })
    // )
    // helper4.position.set(0, 0.1, 0);
    // helper4.castShadow = true;
    // scene.add(helper4);
    // const helper5 = new THREE.Mesh(
    //   new THREE.PlaneGeometry(0.02, 0.02),
    //   new THREE.MeshPhysicalMaterial({ color: 0x00ff00 })
    // )
    // helper5.position.set(0, 0.08, 0);
    // helper4.receiveShadow = true;
    // helper5.lookAt(new Vector3(0, 2, 0));
    // scene.add(helper5);

    return () => {
      // if (sunLight) scene.remove(sunLight);
      if (keyLight) scene.remove(keyLight);
      if (rimLight) scene.remove(rimLight);
      // if (spotlights) spotlights.forEach((spotlight) => { scene.remove(spotlight.target); scene.remove(spotlight); });
      // if (helpers) helpers.forEach((helper) => scene.remove(helper));
      // if (helper1) scene.remove(helper1);
      // if (helper2) scene.remove(helper2);
      // if (helper3) scene.remove(helper3);
      // if (helper4) scene.remove(helper4);
      // if (helper5) scene.remove(helper5);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const reader = new FileReader();
const ModelViewer = ({ assetType, plotZoomMode }) => {
  const { model: paramModel } = useParams();
  const { search } = useLocation();
  const resources = useResourceAssets();
  const buildings = useBuildingAssets();

  const canvasStack = useStore(s => s.canvasStack);
  const dispatchCanvasStacked = useStore(s => s.dispatchCanvasStacked);
  const dispatchCanvasUnstacked = useStore(s => s.dispatchCanvasUnstacked);

  const assets = assetType === 'Building' ? buildings.filter((b, i) => i < 3) : resources;
  const singleModel = plotZoomMode || Number(paramModel);
  
  const [devtoolsEnabled, setDevtoolsEnabled] = useState(!singleModel);
  const [model, setModel] = useState();
  const [bgOverride, setBgOverride] = useState();
  const [bgOverrideName, setBgOverrideName] = useState();
  const [envOverride, setEnvOverride] = useState();
  const [envOverrideName, setEnvOverrideName] = useState();
  const [envStrengthOverride, setEnvStrengthOverride] = useState(assetType === 'Building' ? 0.01 : null);
  const [modelOverride, setModelOverride] = useState();
  const [modelOverrideName, setModelOverrideName] = useState();

  const [lightsEnabled, setLightsEnabled] = useState(assetType === 'Building' ? false : true);
  const [loadingSkybox, setLoadingSkybox] = useState(true);
  const [loadingModel, setLoadingModel] = useState();
  const [rotationEnabled, setRotationEnabled] = useState(assetType === 'Resource');
  const [zoomLimitsEnabled, setZoomLimitsEnabled] = useState(true);

  const [uploadType, setUploadType] = useState();
  const fileInput = useRef();

  useEffect(() => {
    dispatchCanvasStacked(assetType);
    return () => {
      dispatchCanvasUnstacked(assetType);
    }
  }, []);

  const removeOverride = useCallback((which) => () => {
    if (which === 'model') {
      setModelOverride();
      setModelOverrideName();
    } else if (which === 'bg') {
      setBgOverride();
      setBgOverrideName();
    } else if (which === 'env') {
      setEnvOverride();
      setEnvOverrideName();
    }
  }, []);

  const selectModel = useCallback((m) => {
    if (loadingModel) return;
    removeOverride('model')();
    setLoadingModel(true);
    setModel(m);
  }, [loadingModel, removeOverride]);

  const handleLoaded = useCallback(() => {
    setLoadingModel(false);
  }, []);

  const handleUploadClick = useCallback((which) => () => {
    setUploadType(which);
    fileInput.current.click();
  }, []);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (uploadType === 'model' && file.name.match(/\.(gltf|glb)$/i)) {
      setLoadingModel(true);
      reader.readAsDataURL(file);
      reader.onload = () => {
        setModelOverride(reader.result);
        setModelOverrideName(file.name);
      };
    } else if (file.name.match(/\.(hdr|jpg)$/i)) {
      setLoadingSkybox(true);
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (uploadType === 'bg') {
          setBgOverrideName(file.name);
          setBgOverride(reader.result);
        } else if (uploadType === 'env') {
          setEnvOverrideName(file.name);
          setEnvOverride(reader.result);
        }
      };
    } else {
      window.alert('Bad file type.');
    }
  }, [uploadType]);

  const toggleLights = useCallback(() => {
    setLightsEnabled((e) => !e);
  }, []);

  const toggleRotation = useCallback(() => {
    setRotationEnabled((e) => !e);
  }, []);

  const toggleZoomLimits = useCallback(() => {
    setZoomLimitsEnabled((e) => !e);
  }, []);

  const [category, setCategory] = useState();
  const [categories, setCategories] = useState();
  const [categoryModels, setCategoryModels] = useState();
  useEffect(() => {
    if (!!assets) {
      setCategories();
      if (singleModel) {
        const asset = typeof singleModel === 'string'
          ? assets.find((a) => a?.name === singleModel)
          : assets.find((a) => Number(a?.i) === singleModel);
        if (asset) {
          setLoadingModel(true);
          setModel(asset);
          return;
        }
      }

      // this is default if no singleModel or can't find singleModel
      const categorySet = new Set(assets.map((a) => a.category));
      const categoryArr = Array.from(categorySet).sort();
      setCategories(categoryArr);
      setCategory(categoryArr[0]);
    }
  }, [!!assets, assetType, singleModel]);

  useEffect(() => {
    if (!!assets && category !== undefined) {
      const bAssets = assets
        .filter((a) => a.category === category)
        .sort((a, b) => a.name < b.name ? -1 : 1);
      setCategoryModels(bAssets);
      selectModel(bAssets[0]);
    }
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeydown = (e) => {
      if (e.shiftKey && e.which === 32) {
        setDevtoolsEnabled((d) => !d);
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('keydown', onKeydown);
    }
  }, []);

  const onCloseDestination = useMemo(() => new URLSearchParams(search).get('back'), [search]);

  const title = useMemo(() => {
    if (plotZoomMode) return '';
    if (singleModel && model) {
      return `${assetType === 'Resource' ? model.category : 'Infrastructure'} — ${model.name}`;
    }
    return `${assetType} Details`;
  }, [singleModel, model, assetType, plotZoomMode]);

  const isLoading = loadingModel || loadingSkybox;
  return (
    <Details
      edgeToEdge
      hideClose={plotZoomMode}
      lowerZIndex={!!plotZoomMode}
      onCloseDestination={onCloseDestination}
      title={title}>
      <BarLoader color="#AAA" height={3} loading={isLoading} css={loadingCss} />

      {!singleModel && categories && categoryModels && (
        <Dropdowns>
          {categories.length > 1 && (
            <Dropdown
              disabled={isLoading}
              options={categories}
              onChange={(b) => setCategory(b)}
              width="200px" />
          )}
          <Dropdown
            disabled={isLoading}
            labelKey="name"
            options={categoryModels}
            onChange={(a) => selectModel(a)}
            resetOn={category}
            width="200px" />
        </Dropdowns>
      )}
      {process.env.REACT_APP_ENABLE_DEV_TOOLS && devtoolsEnabled && (
        <Devtools>
          <div>
            <Button
              disabled={isLoading}
              onClick={handleUploadClick('model')}>
              Upload Model
            </Button>
            {modelOverrideName && <span onClick={removeOverride('model')}>{modelOverrideName}</span>}
          </div>
          <div>
            <Button
              disabled={isLoading}
              onClick={handleUploadClick('env')}>
              Upload EnvMap
            </Button>
            {envOverrideName && <span onClick={removeOverride('env')}>{envOverrideName}</span>}
          </div>
          <div>
            <Button
              disabled={isLoading}
              onClick={handleUploadClick('bg')}>
              Upload Skybox
            </Button>
            {bgOverrideName && <span onClick={removeOverride('bg')}>{bgOverrideName}</span>}
          </div>
          <div>
            <Button
              disabled={isLoading}
              onClick={toggleLights}>
              Toggle Lighting
            </Button>
            {!lightsEnabled && <span onClick={toggleLights}>Off</span>}
          </div>
          <div>
            <Button
              disabled={isLoading}
              onClick={toggleRotation}>
              Toggle Rotation
            </Button>
            {!rotationEnabled && <span onClick={toggleRotation}>Off</span>}
          </div>
          <div>
            <Button
              disabled={isLoading}
              onClick={toggleZoomLimits}>
              Toggle Zoom Limits
            </Button>
            {!zoomLimitsEnabled && <span onClick={toggleZoomLimits}>Off</span>}
          </div>

          <Miniform>
            <label>Env Map Strength</label>
            <NumberInput
              disabled={isLoading}
              initialValue={ENV_MAP_STRENGTH}
              min="0.1"
              step="0.1"
              onChange={(v) => setEnvStrengthOverride(parseFloat(v))} />
          </Miniform>

          <input
            ref={fileInput}
            onChange={handleFile}
            onClick={(e) => e.target.value = null}
            style={{ display: 'none' }}
            type="file" />
        </Devtools>
      )}

      {!modelOverride && model?.iconUrls?.w125 && (
        <IconContainer>
          <img src={model.iconUrls.w125} alt={`${model.name} icon`} />
        </IconContainer>
      )}

      <CanvasContainer ready={!isLoading}>
        <Canvas
          frameloop={canvasStack[0] === assetType ? 'always' : 'never'}
          shadows
          resize={{ debounce: 5, scroll: false }}
          style={{ height: '100%', width: '100%' }}>
          <Skybox
            assetType={assetType}
            onLoaded={() => setLoadingSkybox(false)}
            overrideBackground={bgOverride}
            overrideBackgroundName={bgOverrideName}
            overrideEnvironment={envOverride}
            overrideEnvironmentName={envOverrideName}
          />
          {/* disabled because this darkens scene too much */}
          {false && assetType === 'Building' && (
            <>
              <ambientLight intensity={0.4} />
              <Postprocessor enabled={true} />
            </>
          )}
          {model?.modelUrl && !loadingSkybox && (
            <Model
              assetType={assetType}
              onLoaded={handleLoaded}
              overrideEnvStrength={envStrengthOverride}
              rotationEnabled={rotationEnabled}
              zoomLimitsEnabled={zoomLimitsEnabled}
              url={modelOverride || model.modelUrl} />
          )}
          {lightsEnabled && <Lighting assetType={assetType} />}
        </Canvas>
      </CanvasContainer>
    </Details>
  );
};

export default ModelViewer;
