import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { Box3, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useCubeTexture } from '@react-three/drei';
import { useLoader, useThree, Canvas } from '@react-three/fiber';
import { RiRefreshLine as SwitcherIcon } from 'react-icons/ri';
import BarLoader from 'react-spinners/BarLoader';
import styled, { css } from 'styled-components';

import useStore from '~/hooks/useStore';
import Details from '~/components/Details';

const loader = new GLTFLoader();

const models = [
  'DamagedHelmet',
  'Ammonia',
  'Soldier',
  'Xenotime',
];

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

  // init the camera
  useEffect(() => {
    controls.current = new OrbitControls(camera, gl.domElement);

    controls.current.minDistance = 0.75;
    controls.current.maxDistance = 10;
    controls.current.target.set(0, 0, 0);

    return () => {
      controls.current.dispose();
    };
  }, [camera, gl]);

  // reset camera on url change
  useEffect(() => {
    controls.current.object.position.set(0, 0, 1.0);
    controls.current.update();
  }, [url]);

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
  }, [url]);

  return null;
}

const Skybox = (props) => {
  const { scene } = useThree();

  const skybox = useCubeTexture([
    'sky_pos_x.jpg', 'sky_neg_x.jpg', 'sky_pos_y.jpg', 'sky_neg_y.jpg', 'sky_pos_z.jpg', 'sky_neg_z.jpg'
  ], { path: `${process.env.PUBLIC_URL}/textures/skybox/`});

  scene.background = skybox;
  scene.environment = skybox;
  return null;
};

const ModelViewer = (props) => {
  const [i, setI] = useState(0);
  const [loadingModel, setLoadingModel] = useState(true);

  // TODO:
  //  - generic draggable modal
  //  - specific mockup for this modal:
  //    https://app.asana.com/0/1201175948505706/1202191784285132/f

  // TODO: add "settings" section, only visible in local and devnet, with button to open modal  

  const toggleI = useCallback(() => {
    setLoadingModel(true);
    setI((i + 1) % models.length);
  }, [i]);

  const handleLoaded = useCallback((success) => {
    setLoadingModel(false);
  }, []);

  return (
    <Details title={(
      <div style={{ alignItems: 'center', display: 'flex' }}>
        <div style={{ marginRight: 8 }}>Model Viewer</div>
        <SwitcherIcon onClick={toggleI} />
      </div>
    )}>
      <Canvas>
        <Model url={`/models/${models[i]}.glb`} onLoaded={handleLoaded} />
        <ambientLight intensity={1.0} />
        <Skybox />
      </Canvas>
      <BarLoader color="#333" loading={loadingModel} css={loadingCss} />
    </Details>
  );
};

export default ModelViewer;
