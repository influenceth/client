import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationMixer, Box3, DirectionalLight, EquirectangularReflectionMapping, PCFSoftShadowMap, Vector2, Vector3 } from 'three';
// import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import Button from '~/components/Button';
import Details from '~/components/DetailsFullsize';
import Dropdown from '~/components/Dropdown';
import NumberInput from '~/components/NumberInput';
import useAssets from '~/hooks/useAssets';
import { useLocation, useParams } from 'react-router-dom';

// TODO: connect to gpu-graphics settings
const ENABLE_SHADOWS = true;
const ENV_MAP_STRENGTH = 4.5;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const CanvasContainer = styled.div`
  height: 100%;
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
  bottom: 60px;
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

const Model = ({ url, onLoaded, overrideEnvStrength, rotationEnabled, zoomLimitsEnabled }) => {
  const { camera, gl, scene } = useThree();

  const animationMixer = useRef();
  const controls = useRef();
  const model = useRef();

  // init the camera (reset when url changes)
  useEffect(() => {
    // TODO (enhancement): on mobile, aspect ratio is such that zoomed out to 1 may not have
    //  view of full width of 1.0 at 0,0,0... so on mobile, should probably set this to 1.5+
    const zoom = 1.75;
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
    controls.current.near = 0.00001;
    controls.current.target.set(0, 0, 0);

    return () => {
      controls.current.dispose();
    };
  }, [camera, gl]);

  useEffect(() => {
    if (zoomLimitsEnabled) {
      controls.current.minDistance = 0.85;
      controls.current.maxDistance = 5;
    } else {
      controls.current.minDistance = 0;
      controls.current.maxDistance = Infinity;
    }
  }, [zoomLimitsEnabled]);

  // init axeshelper
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
    if (model.current) {
      model.current.removeFromParent();
    }
    // if (box3h.current) {
    //   box3h.current.removeFromParent();
    // }
    
    // load the model
    loader.load(
      url,

      // onload
      function (gltf) {
        model.current = gltf.scene || gltf.scenes[0];
        model.current.traverse(function (node) {
          if (node.isMesh) {
            // self-shadowing 
            if (ENABLE_SHADOWS) {
              node.castShadow = true;
              node.receiveShadow = true;
            }

            // env-map intensity
            if (node.material?.envMapIntensity) {
              node.material.envMapIntensity = ENV_MAP_STRENGTH;
            }

            // only worry about depth on non-transparent materials
            // (from https://github.com/donmccurdy/three-gltf-viewer/blob/main/src/viewer.js)
            node.material.depthWrite = !node.material.transparent;
          }
        });

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

        // reposition (to put center at origin)
        bbox.setFromObject(model.current);
        const center = bbox.getCenter(new Vector3());
        model.current.position.x += model.current.position.x - center.x;
        model.current.position.y += model.current.position.y - center.y;
        model.current.position.z += model.current.position.z - center.z;

        // bbox.setFromObject(model.current);
        // box3h.current = new THREE.Box3Helper(bbox);
        // scene.add(box3h.current);

        // initial rotation simulates initial camera position in blender
        // (halfway between the x and z axis)
        // model.current.rotation.y = -Math.PI / 4;

        // add to scene and report as loaded
        scene.add(model.current);

        // init animation mixer
        if (gltf.animations?.length > 0) {
          animationMixer.current = new AnimationMixer(model.current);
          gltf.animations.forEach((clip) => {
            animationMixer.current.clipAction(clip).play();
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
      if (model.current) {
        model.current.removeFromParent();
      }
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
    }
    // if (box3h.current) {
    //   box3h.current.rotation.y += 0.0025;
    // }
    if (animationMixer.current) {
      animationMixer.current.update(delta);
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

const Skybox = ({ onLoaded, overrideBackground, overrideEnvironment }) => {
  const { scene } = useThree();

  useEffect(() => {
    let cleanupTextures = [];

    let background = overrideBackground || '/textures/model-viewer/resource_skybox.hdr';
    let env = overrideEnvironment || '/textures/model-viewer/resource_envmap.hdr';

    let waitingOn = background === env ? 1 : 2;
    new RGBELoader().load(background, function (texture) {
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
      new RGBELoader().load(env, function (texture) {
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
  }, [overrideBackground, overrideEnvironment]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const Lighting = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const keyLight = new DirectionalLight(0xFFFFFF);
    keyLight.intensity = 1.0;
    keyLight.position.set(-2, 2, 2);
    scene.add(keyLight);

    const rimLight = new DirectionalLight(0x9ECFFF);
    rimLight.intensity = 0.25;
    rimLight.position.set(4, 2, 4);
    scene.add(rimLight);

    if (ENABLE_SHADOWS) {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = PCFSoftShadowMap;

      keyLight.castShadow = true;
      keyLight.shadow.camera.near = 2.75;
      keyLight.shadow.camera.far = 4.25;
      keyLight.shadow.camera.bottom = keyLight.shadow.camera.left = -0.75;
      keyLight.shadow.camera.right = keyLight.shadow.camera.top = 0.75;
      keyLight.shadow.camera.updateProjectionMatrix();
      keyLight.shadow.mapSize = new Vector2(1024, 1024);
      keyLight.shadow.bias = -0.02;
    }

    // const helper1 = new THREE.CameraHelper( keyLight.shadow.camera );
    // scene.add(helper1);
    // const helper2 = new THREE.DirectionalLightHelper(keyLight);
    // scene.add(helper2);

    return () => {
      // if (sunLight) scene.remove(sunLight);
      if (keyLight) scene.remove(keyLight);
      if (rimLight) scene.remove(rimLight);
      // if (helper1) scene.remove(helper1);
      // if (helper2) scene.remove(helper2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const reader = new FileReader();
const ModelViewer = (props) => {
  const { data: assets, isLoading: loadingAssets } = useAssets();
  const { model: singleModel } = useParams();
  const { search } = useLocation();

  const [devtoolsEnabled, setDevtoolsEnabled] = useState();
  const [model, setModel] = useState();
  const [bgOverride, setBgOverride] = useState();
  const [bgOverrideName, setBgOverrideName] = useState();
  const [envOverride, setEnvOverride] = useState();
  const [envOverrideName, setEnvOverrideName] = useState();
  const [envStrengthOverride, setEnvStrengthOverride] = useState();
  const [modelOverride, setModelOverride] = useState();
  const [modelOverrideName, setModelOverrideName] = useState();

  const [lightsEnabled, setLightsEnabled] = useState(true);
  const [loadingSkybox, setLoadingSkybox] = useState(true);
  const [loadingModel, setLoadingModel] = useState();
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [zoomLimitsEnabled, setZoomLimitsEnabled] = useState(true);

  const [uploadType, setUploadType] = useState();
  const fileInput = useRef();

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
    } else if (file.name.match(/\.(hdr)$/i)) {
      setLoadingSkybox(true);
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (uploadType === 'bg') {
          setBgOverride(reader.result);
          setBgOverrideName(file.name);
        } else if (uploadType === 'env') {
          setEnvOverride(reader.result);
          setEnvOverrideName(file.name);
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
      if (singleModel) {
        const asset = assets.find((a) => a.label === singleModel);
        if (asset) {
          setModel(asset);
          return;
        }
      }
      
      // this is default if no singleModel or can't find singleModel
      const categorySet = new Set(assets.map((a) => a.category));
      const categoryArr = Array.from(categorySet).sort();
      setCategories(categoryArr);
    }
  }, [!!assets, singleModel]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (!!categories) {
      setCategory(categories[0]);
    }
  }, [!!categories]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (!!assets && category) {
      const bAssets = assets
        .filter((a) => a.category === category)
        .sort((a, b) => a.label < b.label ? -1 : 1);
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

  const isLoading = loadingAssets || loadingModel || loadingSkybox;
  return (
    <Details
      edgeToEdge
      onCloseDestination={onCloseDestination}
      title={singleModel ? `${model?.category} — ${model?.label}` : `Resource Details`}>
      <BarLoader color="#AAA" height={3} loading={isLoading} css={loadingCss} />

      {!singleModel && categories && categoryModels && (
        <Dropdowns>
          <Dropdown
            disabled={isLoading}
            options={categories}
            onChange={(b) => setCategory(b)}
            width="200px" />
          <Dropdown
            disabled={isLoading}
            labelKey="label"
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

      {!modelOverride && model?.iconUrl && (
        <IconContainer>
          <img src={model.iconUrl} alt={`${model.label} icon`} />
        </IconContainer>
      )}

      <CanvasContainer>
        <Canvas
          resize={{ debounce: 5, scroll: false }}
          style={{ height: '100%', width: '100%' }}>
          <Skybox
            onLoaded={() => setLoadingSkybox(false)}
            overrideBackground={bgOverride}
            overrideEnvironment={envOverride}
          />
          {model?.modelUrl && !loadingSkybox && (
            <Model
              onLoaded={handleLoaded}
              overrideEnvStrength={envStrengthOverride}
              rotationEnabled={rotationEnabled}
              zoomLimitsEnabled={zoomLimitsEnabled}
              url={modelOverride || model.modelUrl} />
          )}
          {lightsEnabled && <Lighting />}
        </Canvas>
      </CanvasContainer>
    </Details>
  );
};

export default ModelViewer;
