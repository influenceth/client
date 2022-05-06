import { useCallback, useEffect, useRef, useState } from 'react';
import { Box3, EquirectangularReflectionMapping, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { BiChevronDown as SelectIcon } from 'react-icons/bi';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import DraggableModal from '~/components/DraggableModal';
import models from '~/lib/models';

const loader = new GLTFLoader();

const CanvasContainer = styled.div`
  height: 400px;
  max-height: calc(80vh - 56px);
  max-width: calc(80vw - 16px);
  width: 400px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 100%;
    max-height: none;
    max-width: none;
    width: 100%;
  }
`;

const Menu = styled.div`
  background: black;
  display: ${p => p.isOpen ? 'block' : 'none'};
  left: 12px;
  height: 300px;
  overflow-y: auto;
  position: absolute;
  top: 1px;
  z-index: 1000;
`;

const MenuItem = styled.div`
  cursor: ${p => p.theme.cursors.active};
  padding: 4px 12px;
  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  }
`;

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
`;

const recursivelySetEnvMapIntensity = (model, intensity) => {
  if (model?.material?.envMapIntensity) {
    model.material.envMapIntensity = intensity;
  }
  model.children.forEach((c) => {
    recursivelySetEnvMapIntensity(c, intensity);
  });
};

const envOptions = [
  { bg: 'studio.hdr', intensity: 1 },
  { bg: 'studio_darkened.hdr', intensity: 25 },
  { bg: 'studio_darkened2.hdr', intensity: 500 },
];
const ENV = envOptions[2];

const Model = ({ url, onLoaded }) => {
  const { camera, gl, scene } = useThree();

  const controls = useRef();
  const model = useRef();

  // init the camera (reset when url changes)
  useEffect(() => {
    // TODO (enhancement): on mobile, aspect ratio is such that zoomed out to 1 may
    //  not have view of full width of 1.0 at 0,0,0... so on mobile, should probably
    //  set this to 1.5+
    camera.position.set(0, 0, 1.5);
    camera.up.set(0, 1, 0);
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

  // load the model on url change
  useEffect(() => {
    if (model.current) {
      model.current.removeFromParent();
    }
    
    // load the model
    loader.load(
      url,

      // onload
      function (gltf) {
        // TODO (as needed): see https://sbcode.net/threejs/loaders-gltf/ for how to traverse children of model
        model.current = gltf.scene;
        recursivelySetEnvMapIntensity(model.current, ENV.intensity);

        // get bounding box of model
        const bbox = new Box3().setFromObject(model.current);
        const center = bbox.getCenter(new Vector3());
        const size = bbox.getSize(new Vector3());

        // update scale (normalize to max dimensional size of 1.0), then adjust to center at 0,0,0
        const scaleValue = 1.0 / Math.max(size.x, size.y, size.z);
        const posValue = new Vector3(center.x, center.y, center.z).multiplyScalar(-scaleValue);

        scene.add(model.current);
        model.current.scale.set(scaleValue, scaleValue, scaleValue);
        model.current.position.set(posValue.x, posValue.y, posValue.z);

        onLoaded(true);
      },

      // onprogress
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
      model.current.rotation.y += 0.005;
    }
  });

  return null;
}

const Skybox = ({ onLoaded }) => {
  const { scene } = useThree();

  useEffect(() => {
    let cleanupTexture;
    new RGBELoader().load(`textures/model-viewer/${ENV.bg}`, function (texture) {
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

const ModelViewer = ({ draggableId }) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [model, setModel] = useState(models[Math.floor(Math.random() * models.length)]);
  const [loadingSkybox, setLoadingSkybox] = useState(true);
  const [loadingModel, setLoadingModel] = useState(true);

  const selectModel = useCallback((m) => {
    if (loadingModel) return;
    setLoadingModel(true);
    setModel(m);
    setOpenMenu(false);
  }, [loadingModel]);

  const handleLoaded = useCallback((success) => {
    setLoadingModel(false);
  }, []);

  return (
    <DraggableModal draggableId={draggableId} title={(
      <div onClick={() => setOpenMenu(!openMenu)} style={{ alignItems: 'center', display: 'inline-flex' }}>
        {model.title}
        <SelectIcon />
      </div>
    )}>
      <Menu isOpen={openMenu} onMouseLeave={() => setOpenMenu(false)}>
        {models.map((m) => (
          <MenuItem key={m.slug} onClick={() => selectModel(m)}>{m.title}</MenuItem>
        ))}
      </Menu>
      <CanvasContainer>
        <Canvas style={{ height: '100%', width: '100%' }}>
          <Skybox onLoaded={() => setLoadingSkybox(false)} />
          {!loadingSkybox && <Model url={`https://res.cloudinary.com/influenceth/image/upload/v1651851083/models/${model.slug}`} onLoaded={handleLoaded} />}
        </Canvas>
      </CanvasContainer>
      <BarLoader color="#777" height={3} loading={loadingModel || loadingSkybox} css={loadingCss} />
    </DraggableModal>
  );
};

export default ModelViewer;
