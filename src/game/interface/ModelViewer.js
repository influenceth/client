import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationMixer, Box3, Color, DirectionalLight, EquirectangularReflectionMapping, LoopRepeat, Raycaster, Vector2, Vector3 } from 'three';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { useLocation, useParams } from 'react-router-dom';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import { useBuildingAssets, useResourceAssets, useShipAssets } from '~/hooks/useAssets';
import Button from '~/components/Button';
import Details from '~/components/DetailsFullsize';
import Dropdown from '~/components/Dropdown';
import NumberInput from '~/components/NumberInput';
import Postprocessor from '../Postprocessor';
import useStore from '~/hooks/useStore';

// TODO: connect to gpu-graphics settings?
const ENABLE_SHADOWS = true;
const ENV_MAP_STRENGTH = 4.5;
const MAX_LIGHTS = 10;
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

const Model = ({ url, onLoaded, overrideEnvName, overrideEnvStrength, rotationEnabled, zoomLimitsEnabled, ...settings }) => {
  const { camera, clock, gl, scene } = useThree();
  const pixelRatio = useStore(s => s.graphics.pixelRatio);

  useEffect(() => {
    gl.setPixelRatio(pixelRatio || 1);
  }, [pixelRatio]);

  // if three is started with frameloop == 'never', clock is not set to autoStart, so we need to set it
  useEffect(() => {
    if (clock && !clock.autoStart) clock.autoStart = true;
  }, []);

  const animationMixer = useRef();
  const maxCameraDistance = useRef();
  const controls = useRef();
  const model = useRef();

  const collisionFloor = useRef();
  const raycaster = useRef(new Raycaster());

  // init the camera (reset when url changes)
  useEffect(() => {
    // TODO (enhancement): on mobile, aspect ratio is such that zoomed out to 1 may not have
    //  view of full width of 1.0 at 0,0,0... so on mobile, should probably set this to 1.5+
    const zoom = settings.initialZoom || 1;
    camera.position.set(0, 0.75 * zoom, 1.25 * zoom);
    camera.up.set(0, 1, 0);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.update();
    }
  }, [settings.initialZoom, url]); // eslint-disable-line react-hooks/exhaustive-deps

  // init orbitcontrols
  useEffect(() => {
    controls.current = new OrbitControls(camera, gl.domElement);
    controls.current.target.set(0, 0, 0);
    controls.current.zoomSpeed = 0.33;

    controls.current.object.near = settings.enablePostprocessing ? 0.0018 : 0.001;  // postprocessing introduces acne if near is too low
    controls.current.object.far = 10;
    controls.current.object.updateProjectionMatrix();

    return () => {
      controls.current.dispose();
    };
  }, [camera, gl]);

  useEffect(() => {
    if (zoomLimitsEnabled && settings.simpleZoomConstraints) {
      controls.current.minDistance = settings.simpleZoomConstraints[0];
      controls.current.maxDistance = settings.simpleZoomConstraints[1];
    } else {
      controls.current.minDistance = 0;
      controls.current.maxDistance = Infinity;
    }
  }, [settings.simpleZoomConstraints, zoomLimitsEnabled]);

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
        let totalLights = 0;

        const removeNodes = [];
        model.current = gltf.scene || gltf.scenes[0];
        model.current.traverse(function (node) {
          node.receiveShadow = true;
          if (node.name === 'Center') {
            predefinedCenter = node.position.clone();
          } else if (node.name === 'Camera') {
            predefinedCamera = node.position.clone();
          } else if (node.isMesh) {
            if (node.name === settings.floorNodeName) {
              collisionFloor.current = node;
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

            // rewrite emissive map to lightmap
            if (settings.emissiveMapAsLightMap) {
              node.material.envMapIntensity = overrideEnvName ? ENV_MAP_STRENGTH : 0;
              if (node.material?.emissiveMap) {
                if (node.material.lightMap) console.warn('LIGHTMAP overwritten by emissiveMap', node);

                node.material.lightMap = node.material.emissiveMap;
                node.material.emissive = new Color(0x0);
                node.material.emissiveMap = null;
              }
            }

            // use no-map emissive color as indication mesh should be bloomed
            // NOTE: this only does something if bloom postprocessing is also enabled
            if (settings.emissiveAsBloom) {
              if (node.material.emissive && node.material.emissive.getHex() > 0) {
                if (node.material.emissiveIntensity > 1) {
                  console.warn(`emissiveIntensity > 1 on material "${node.material.name}" @ node "${node.name}"`);
                  node.material.emissiveIntensity = Math.min(node.material.emissiveIntensity, 1);
                }
                node.material.toneMapped = false;
                node.userData.bloom = true;
              }
            }

            // no depth evaluation on transparent materials (NOTE: this may happen automatically in gltfloader now)
            // (from https://github.com/donmccurdy/three-gltf-viewer/blob/main/src/viewer.js)
            node.material.depthWrite = !node.material.transparent;

          // allow embedded spotlights per settings (up to MAX_LIGHTS)
          } else if (node.isLight) {
            if (settings.enableEmbeddedLights && node.isSpotLight) {
              if (totalLights < MAX_LIGHTS) {
                node.castShadow = true;
                node.shadow.bias = -0.0001;
                node.intensity /= 8;
              } else {
                console.warn(`excessive light (#${totalLights}) removed: `, node.name);
              }
              totalLights++;

            } else {
              console.warn(`unexpected light (${node.type}) removed: `, node.name);
              removeNodes.push(node);
            }
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

        if (settings.maxCameraDistance) {
          // maxCameraDistance.current = 2 * controls.current.object.position.length();
          maxCameraDistance.current = settings.maxCameraDistance;
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
          node.material.envMapIntensity = overrideEnvStrength || ENV_MAP_STRENGTH;
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
    if (maxCameraDistance.current || collisionFloor.current) {
      if (controls.current.object && controls.current.target) {
        let updateControls = false;

        // collision detection on asteroid terrain
        if (collisionFloor.current) {
          raycaster.current.set(
            new Vector3(
              controls.current.object.position.x,
              1,
              controls.current.object.position.z,
            ),
            DOWN
          );
          const intercepts = raycaster.current.intersectObject(collisionFloor.current, false);
          if (intercepts.length > 0) {
            const buffer = controls.current.object.near;
            if (intercepts[0].point.y + buffer > controls.current.object.position.y) {
              controls.current.object.position.set(
                controls.current.object.position.x,
                intercepts[0].point.y + buffer * 1.001,
                controls.current.object.position.z,
              );
              updateControls = true;
            }
          }
        }

        // max camera distance (enforcing on zoom and on pan)
        if (zoomLimitsEnabled && maxCameraDistance.current) {
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

const Skybox = ({ defaultBackground, defaultEnvmap, onLoaded, overrideBackground, overrideBackgroundName, overrideEnvironment, overrideEnvironmentName }) => {
  const { scene } = useThree();

  useEffect(() => {
    let cleanupTextures = [];

    let background = overrideBackground || defaultBackground;
    let env = overrideEnvironment || defaultEnvmap;

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
  }, [defaultBackground, defaultEnvmap, overrideBackground, overrideEnvironment]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const Lighting = ({ keylightIntensity = 1.0, rimlightIntensity = 0.25 }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    let keyLight;
    if (keylightIntensity > 0) {
      keyLight = new DirectionalLight(0xFFFFFF);
      keyLight.castShadow = true;
      keyLight.intensity = keylightIntensity;
      keyLight.position.set(-2, 2, 2);
      scene.add(keyLight);

      if (ENABLE_SHADOWS) {
        gl.shadowMap.enabled = true;
        // gl.shadowMap.type = PCFSoftShadowMap;

        keyLight.castShadow = true;
        keyLight.shadow.camera.near = 2.75;
        keyLight.shadow.camera.far = 4.25;
        keyLight.shadow.camera.bottom = keyLight.shadow.camera.left = -0.75;
        keyLight.shadow.camera.right = keyLight.shadow.camera.top = 0.75;
        // keyLight.shadow.camera.near = 1.75;
        // keyLight.shadow.camera.far = 2.25;
        // keyLight.shadow.camera.bottom = keyLight.shadow.camera.left = -0.15;
        // keyLight.shadow.camera.right = keyLight.shadow.camera.top = 0.15;
        keyLight.shadow.camera.updateProjectionMatrix();
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.mapSize.width = 1024;
        // keyLight.shadow.bias = -0.02;
      }
    }

    let rimLight;
    if (rimlightIntensity > 0) {
      rimLight = new DirectionalLight(0x9ECFFF);
      rimLight.intensity = rimlightIntensity;
      rimLight.position.set(4, 2, 4);
      scene.add(rimLight);
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
const ModelViewer = ({ assetType, inGameMode }) => {
  const { model: paramModel } = useParams();
  const { search } = useLocation();
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const ships = useShipAssets();

  const canvasStack = useStore(s => s.canvasStack);
  const pixelRatio = useStore(s => s.graphics.pixelRatio);
  const dispatchCanvasStacked = useStore(s => s.dispatchCanvasStacked);
  const dispatchCanvasUnstacked = useStore(s => s.dispatchCanvasUnstacked);

  const assets = useMemo(() => {
    if (assetType === 'Building') return buildings.filter((b, i) => i < 3);
    if (assetType === 'Resource') return resources;
    if (assetType === 'Ship') return ships;
  }, [assetType, buildings, resources, ships]);

  const settings = useMemo(() => {
    const s = {
      background: '/textures/model-viewer/building_skybox.jpg',
      envmap: '/textures/model-viewer/resource_envmap.hdr',
    };

    if (assetType === 'Building') {
      s.bloomOverrides = { strength: 5, radius: 1 }; // { strength: 3, radius: 0.25 };
      s.emissiveAsBloom = true;
      s.emissiveMapAsLightMap = true;
      s.envStrengthOverride = 0.01;
      s.enableEmbeddedLights = true;
      s.enablePostprocessing = true;
      s.floorNodeName = 'Asteroid_Terrain'; // (enforces collision detection with this node (only in y-axis direction))
      s.maxCameraDistance = 0.1;  // NOTE: use this or simple zoom constraints, not both
      s.initialZoom = 0.2;
      s.keylightIntensity = 0;

    } else if (assetType === 'Resource') {
      s.background = '/textures/model-viewer/resource_skybox.hdr';
      s.initialZoom = 1.75;
      s.lightsEnabled = true;
      s.removeModelLights = true;
      s.rotationEnabled = true;
      s.simpleZoomConstraints = [0.85, 5];  // TODO: if using simple zoom constraints, should probably not allow panning... maybe all should use maxCameraDistance?

    } else if (assetType === 'Ship') {
      s.emissiveAsBloom = true;
      s.enableEmbeddedLights = true;
      s.enablePostprocessing = true;
    }
    return s;
  }, [assetType]);
  
  const singleModel = inGameMode || Number(paramModel);
  
  const [devtoolsEnabled, setDevtoolsEnabled] = useState(!singleModel);
  const [model, setModel] = useState();
  const [bgOverride, setBgOverride] = useState();
  const [bgOverrideName, setBgOverrideName] = useState();
  const [bloomRadiusOverride, setBloomRadiusOverride] = useState(settings.bloomOverrides?.radius || 0.25);
  const [bloomStrengthOverride, setBloomStrengthOverride] = useState(settings.bloomOverrides?.strength || 2);
  const [envOverride, setEnvOverride] = useState();
  const [envOverrideName, setEnvOverrideName] = useState();
  const [envStrengthOverride, setEnvStrengthOverride] = useState(settings.envStrengthOverride);
  const [modelOverride, setModelOverride] = useState();
  const [modelOverrideName, setModelOverrideName] = useState();
  const [postprocessingEnabled, setPostprocessingEnabled] = useState(!!settings.enablePostprocessing);

  const [lightsEnabled, setLightsEnabled] = useState(!!settings.lightsEnabled);
  const [loadingSkybox, setLoadingSkybox] = useState(true);
  const [loadingModel, setLoadingModel] = useState();
  const [rotationEnabled, setRotationEnabled] = useState(settings.rotationEnabled);
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

  const togglePostprocessing = useCallback(() => {
    setPostprocessingEnabled((e) => !e);
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
    if (inGameMode) return '';
    if (singleModel && model) {
      return `${assetType === 'Resource' ? model.category : 'Infrastructure'} — ${model.name}`;
    }
    return `${assetType} Details`;
  }, [singleModel, model, assetType, inGameMode]);

  const bloomOverrides = useMemo(() => ({
    key: `${pixelRatio}_${bloomRadiusOverride}_${bloomStrengthOverride}`,
    radius: bloomRadiusOverride,
    strength: bloomStrengthOverride
  }), [bloomRadiusOverride, bloomStrengthOverride, pixelRatio]);

  const isLoading = loadingModel || loadingSkybox;
  return (
    <Details
      edgeToEdge
      hideClose={inGameMode}
      lowerZIndex={!!inGameMode}
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
              onClick={togglePostprocessing}>
              Toggle Bloom
            </Button>
            {!postprocessingEnabled && <span onClick={togglePostprocessing}>Off</span>}
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

          {postprocessingEnabled && (
            <>
              <Miniform>
                <label>Bloom Radius</label>
                <NumberInput
                  disabled={isLoading}
                  initialValue={bloomRadiusOverride}
                  min="0"
                  step="0.05"
                  onChange={(v) => setBloomRadiusOverride(parseFloat(v))} />
              </Miniform>

              <Miniform>
                <label>Bloom Strength</label>
                <NumberInput
                  disabled={isLoading}
                  initialValue={bloomStrengthOverride}
                  min="0"
                  step="0.5"
                  onChange={(v) => setBloomStrengthOverride(parseFloat(v))} />
              </Miniform>
            </>
          )}

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
            defaultBackground={settings.background}
            defaultEnvmap={settings.envmap}
            onLoaded={() => setLoadingSkybox(false)}
            overrideBackground={bgOverride}
            overrideBackgroundName={bgOverrideName}
            overrideEnvironment={envOverride}
            overrideEnvironmentName={envOverrideName}
          />

          {postprocessingEnabled && (
            <Postprocessor key={bloomOverrides?.key} enabled isModelViewer bloomParams={bloomOverrides} />
          )}

          {model?.modelUrl && !loadingSkybox && (
            <Model
              onLoaded={handleLoaded}
              overrideEnvName={envOverrideName}
              overrideEnvStrength={envStrengthOverride}
              rotationEnabled={rotationEnabled}
              url={modelOverride || model.modelUrl}
              zoomLimitsEnabled={zoomLimitsEnabled}
              {...settings} />
          )}

          {lightsEnabled && (
            <Lighting
              keylightIntensity={settings.keylightIntensity}
              rimlightIntensity={settings.rimlightIntensity} />
          )}
        </Canvas>
      </CanvasContainer>
    </Details>
  );
};

export default ModelViewer;
