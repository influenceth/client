import { useCallback, useEffect, useRef, useState } from 'react';
import { Box3, EquirectangularReflectionMapping, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { RiRefreshLine as SwitcherIcon } from 'react-icons/ri';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import DraggableModal from '~/components/DraggableModal';

const loader = new GLTFLoader();

// TODO: remove these placeholders from assets
const models = [
  'DamagedHelmet',
  'Ammonia',
  'Soldier',
  'Xenotime',
];

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

const loadingCss = css`
  left: 0;
  position: absolute;
  right: 0;
  bottom: 0;
  width: 100%;
`;

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
      scene.remove(model.current);
    }
    
    // load the model
    loader.load(
      url,

      // onload
      function (gltf) {
        // TODO (as needed): see https://sbcode.net/threejs/loaders-gltf/ for how to traverse children of model
        model.current = gltf.scene;

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

const Skybox = (props) => {
  const { scene } = useThree();

  useEffect(() => {
    let cleanupTexture;
    new RGBELoader().load('textures/model-viewer/studio_small.hdr', function (texture) {
      cleanupTexture = texture;
      texture.mapping = EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;
    });
    return () => {
      if (cleanupTexture) {
        cleanupTexture.dispose();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// TODO (enhancement): on resize, make sure dialogs still entirely on screen
const ModelViewer = ({ draggableId }) => {
  const [i, setI] = useState(0);
  const [loadingModel, setLoadingModel] = useState(true);

  const toggleI = useCallback(() => {
    setLoadingModel(true);
    setI((i + 1) % models.length);
  }, [i]);

  const handleLoaded = useCallback((success) => {
    setLoadingModel(false);
  }, []);

  return (
    <DraggableModal draggableId={draggableId} title={(
      <div style={{ alignItems: 'center', display: 'flex' }}>
        <div style={{ marginRight: 8 }}>Model Viewer</div>
        <SwitcherIcon onClick={toggleI} />
      </div>
    )}>
      <CanvasContainer>
        <Canvas style={{ height: '100%', width: '100%' }}>
          <Model url={`/models/${models[i]}.glb`} onLoaded={handleLoaded} />
          <Skybox />
        </Canvas>
      </CanvasContainer>
      <BarLoader color="#777" height={3} loading={loadingModel} css={loadingCss} />
    </DraggableModal>
  );
};

export default ModelViewer;
