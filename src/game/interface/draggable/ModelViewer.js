import { useCallback, useEffect, useRef, useState } from 'react';
import { Box3, DirectionalLight, EquirectangularReflectionMapping, PCFSoftShadowMap, Vector2, Vector3 } from 'three';
// import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { BiListUl as SelectIcon, BiUpload as UploadIcon } from 'react-icons/bi';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import DraggableModal from '~/components/DraggableModal';
import IconButton from '~/components/IconButton';
import models from '~/lib/models';

// TODO: connect to gpu-graphics settings
const ENABLE_SHADOWS = true;

const loader = new GLTFLoader();

const CanvasContainer = styled.div`
  height: 500px;
  max-height: calc(80vh - 56px);
  max-width: calc(80vw - 16px);
  width: 500px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 100%;
    max-height: none;
    max-width: none;
    width: 100%;
  }
`;

const Openers = styled.div`
  right: 7px;  
  position: absolute;
  top: 7px;
  z-index: 2;
  & > button {
    margin-right: 0;
    &:last-child {
      margin-left: 4px;
    }
  }
`;

const Menu = styled.div`
  background: black;
  bottom: 6px;
  display: ${p => p.isOpen ? 'block' : 'none'};
  overflow-y: auto;
  position: absolute;
  right: 6px;
  top: 6px;
  z-index: 1000;
`;

const MenuItem = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, ${p => p.isSelected ? 0.5 : 0.0});
  cursor: ${p => p.isSelected ? p.theme.cursors.default : p.theme.cursors.active};
  padding: 4px 12px;
  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, ${p => p.isSelected ? 0.5 : 0.2});
  }
`;

const loadingCss = css`
  bottom: 3px;
  left: 3px;
  position: absolute;
  right: 3px;
  width: calc(100% - 6px);
`;

const Model = ({ url, onLoaded }) => {
  const { camera, gl, scene } = useThree();

  const controls = useRef();
  const model = useRef();

  // init the camera (reset when url changes)
  useEffect(() => {
    // TODO (enhancement): on mobile, aspect ratio is such that zoomed out to 1 may not have
    //  view of full width of 1.0 at 0,0,0... so on mobile, should probably set this to 1.5+
    camera.position.set(0, 0.75, 1.25);
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

    controls.current.minDistance = 0.75;
    controls.current.maxDistance = 10;
    controls.current.target.set(0, 0, 0);

    return () => {
      controls.current.dispose();
    };
  }, [camera, gl]);

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
              node.material.envMapIntensity = 3.0;
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
        const crossVector = new Vector3();
        crossVector.subVectors(
          new Vector3(bbox.max.x, 0, bbox.max.z),
          new Vector3(bbox.min.x, 0, bbox.min.z),
        );
        const height = bbox.max.y - bbox.min.y;
        const scaleValue = 1.0 / Math.max(height, crossVector.length());
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
        model.current.rotation.y = -Math.PI / 4;

        // add to scene and report as loaded
        scene.add(model.current);
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
      scene.remove(model.current);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLoaded, url]);

  useFrame(() => {
    if (model.current) {
      model.current.rotation.y += 0.0025;
    }
    // if (box3h.current) {
    //   box3h.current.rotation.y += 0.0025;
    // }
  });

  return null;
  // return (
  //   <mesh>
  //     <boxGeometry args={[1, 1, 1]} />
  //     <meshStandardMaterial color="orange" opacity={0.2} transparent />
  //   </mesh>
  // );
}

const Skybox = ({ onLoaded }) => {
  const { scene } = useThree();

  useEffect(() => {
    let cleanupTexture;
    new RGBELoader().load(`textures/model-viewer/courtyard_darkened4.hdr`, function (texture) {
      cleanupTexture = texture;
      texture.mapping = EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
      onLoaded();
    });
    return () => {
      if (cleanupTexture) {
        cleanupTexture.dispose();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
const ModelViewer = ({ draggableId }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [model, setModel] = useState(models[0]);
  const [modelOverride, setModelOverride] = useState();
  const [loadingSkybox, setLoadingSkybox] = useState(true);
  const [loadingModel, setLoadingModel] = useState(true);

  const fileInput = useRef();

  const selectModel = useCallback((m) => {
    if (loadingModel) return;
    setModelOverride();
    setLoadingModel(true);
    setModel(m);
    setOpenMenu(false);
  }, [loadingModel]);

  const handleLoaded = useCallback((success) => {
    setLoadingModel(false);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInput.current.click();
  }, []);

  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (file.name.match(/\.(gltf|glb)$/i)) {
      setLoadingModel(true);
      reader.readAsDataURL(file);
      reader.onload = () => {
        setModelOverride(reader.result);
      };
    }
  }, []);

  return (
    <DraggableModal draggableId={draggableId} title="Model Viewer">
      <Openers>
        <IconButton
          data-for="global"
          data-place="left"
          data-tip="Upload Model..." 
          onClick={handleUploadClick}>
          <UploadIcon />
        </IconButton>
        <input
          ref={fileInput}
          onChange={handleFile}
          onClick={(e) => e.target.value = null}
          style={{ display: 'none' }}
          type="file" />

        <IconButton
          data-for="global"
          data-place="right"
          data-tip="Select Model..." 
          onClick={() => setOpenMenu(!openMenu)}>
          <SelectIcon />
        </IconButton>
      </Openers>

      <Menu isOpen={openMenu} onMouseLeave={() => setOpenMenu(false)}>
        {modelOverride && (
          <MenuItem isSelected>(Custom)</MenuItem>
        )}
        {models.map((m) => {
          const isSelected = !modelOverride && m.slug === model.slug;
          return (
            <MenuItem
              key={m.slug}
              isSelected={isSelected}
              onClick={() => isSelected ? false : selectModel(m)}>
              {m.title}
            </MenuItem>
          );
        })}
      </Menu>
      <CanvasContainer>
        <Canvas style={{ height: '100%', width: '100%' }}>
          <Skybox onLoaded={() => setLoadingSkybox(false)} />
          {!loadingSkybox && (
            <Model
              onLoaded={handleLoaded}
              url={modelOverride || `https://res.cloudinary.com/influenceth/image/upload/v1651851083/models/${model.slug}`} />
          )}
          <Lighting />
        </Canvas>
      </CanvasContainer>
      <BarLoader color="#777" height={3} loading={loadingModel || loadingSkybox} css={loadingCss} />
    </DraggableModal>
  );
};

export default ModelViewer;
