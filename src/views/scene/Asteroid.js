import { useState, useEffect, useRef } from 'react';
import { DataTexture, LessDepth, BufferGeometryLoader, MeshStandardMaterial, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { KeplerianOrbit } from 'influence-utils';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import TextureRenderer from '~/lib/graphics/TextureRenderer';
import CubeSphere from '~/lib/graphics/CubeSphere';
import Config from './asteroid/Config';
import HeightMap from './asteroid/HeightMap';
import ColorMap from './asteroid/ColorMap';
import NormalMap from './asteroid/NormalMap';
import constants from '~/lib/constants';

// Setup worker or main thread textureRenderer depending on browser
let worker, textureRenderer;

if (!!window.Worker && typeof OffscreenCanvas !== 'undefined') {
  worker = new Worker();
} else {
  textureRenderer = new TextureRenderer();
}

const Asteroid = (props) => {
  const controls = useThree(({ controls }) => controls);
  const camera = useThree(({ camera }) => camera);
  const origin = useStore(state => state.asteroids.origin);
  const time = useStore(state => state.time.current);
  const mapSize = useStore(state => state.graphics.textureSize);
  const shadows = useStore(state => state.graphics.shadows);
  const shadowSize = useStore(state => state.graphics.shadowSize);
  const { data: asteroidData } = useAsteroid(origin);

  const group = useRef();
  const light = useRef();
  const asteroidOrbit = useRef();

  const [ position, setPosition ] = useState([ 0, 0, 0 ]);
  const [ config, setConfig ] = useState();
  const [ maps, setMaps ] = useState();
  const [ materials, setMaterials ] = useState();
  const [ geometry, setGeometry ] = useState();

  // Positions the asteroid in space based on time changes
  useEffect(() => {
    if (!!asteroidData && !asteroidOrbit.current) asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
    if (!asteroidData) asteroidOrbit.current = null;

    if (asteroidOrbit.current && time) {
      // TODO: add back time dependency
      setPosition(Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU));
    }
  }, [ asteroidData ]);

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    if (!!asteroidData) setConfig(new Config(asteroidData));

    // Cleanup when there's no data
    if (!asteroidData) {
      setConfig(null);

      geometry?.dispose();
      setGeometry(null);

      materials?.forEach(m => {
        m.map?.dispose();
        m.normalMap?.dispose();
      });
      setMaterials(null);
    }
  }, [ asteroidData ]);

  // Kicks of rendering of each map based on the asteroid's unique config either in worker or main
  useEffect(() => {
    if (!config || !mapSize) return;

    if (!!worker) {
      worker.postMessage({ topic: 'renderMaps', mapSize, config });

      worker.onmessage = (event) => {
        if (event.data.topic === 'maps') {
          const { heightMap, colorMap, normalMap } = event.data;
          setMaps({ heightMap, colorMap, normalMap });
        }
      };
    } else if (!!textureRenderer) {
      const renderMaps = async () => {
        const heightMap = new HeightMap(mapSize, config, textureRenderer);
        const colorMapObj = new ColorMap(mapSize, heightMap, config, textureRenderer);
        const colorMap = await colorMapObj.generateColorMap();
        const normalMap = new NormalMap(mapSize, heightMap, config, textureRenderer);
        setMaps({ heightMap, colorMap, normalMap });
      };

      renderMaps();
    }
  }, [ config, mapSize ]);

  // Receives updated maps and generates the geometry based on heightMap
  useEffect(() => {
    if (!config || !maps) return;

    if (!!worker) {
      worker.postMessage({ topic: 'renderGeometry', heightMap: maps.heightMap, config });

      worker.onmessage = (event) => {
        if (event.data.topic === 'geometry') {
          const loader = new BufferGeometryLoader();
          setGeometry(loader.parse(event.data.geometryJSON));
        }
      };
    } else if (!!textureRenderer) {
      const geometry = new CubeSphere(1, 50);
      geometry.displaceWithHeightMap(maps.heightMap, config.radius, config);
      delete geometry.parameters;
      const geometryJSON = geometry.toJSON();
      const loader = new BufferGeometryLoader();
      setGeometry(loader.parse(geometryJSON));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ maps ]);

  // Recieves the updated maps and applies them to the material
  useEffect(() => {
    if (!maps) return;
    const processed = {};
    const materials = [];

    Object.keys(maps).forEach(k => {
      processed[k] = maps[k].map(m => {
        const tex = new DataTexture(m.buffer, m.width, m.height, m.format);
        return Object.assign(tex, m.options);
      });
    });

    for (let i = 0; i < 6; i++) {
      materials.push(new MeshStandardMaterial({
        color: 0xffffff,
        depthFunc: LessDepth,
        dithering: true,
        map: processed.colorMap[i],
        metalness: 0,
        normalMap: processed.normalMap[i],
        roughness: 1
      }));
    }

    setMaterials(materials);
  }, [ maps ]);

  useEffect(() => {
    if (geometry) {
      const posVec = new Vector3(...position);
      light.current.intensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
      light.current.position.copy(posVec.clone().normalize().negate().multiplyScalar(asteroidData.radius * 10));
      geometry.computeBoundingSphere();
      const maxRadius = geometry.boundingSphere.radius + geometry.boundingSphere.center.length();
      const radiusBump = 0; // this.asteroidConfig.ringsPresent ? 1 : 0;

      if (shadows) {
        light.current.castShadow = true;
        light.current.shadow.mapSize.height = light.current.shadow.mapSize.width = shadowSize;
        light.current.shadow.camera.near = maxRadius * (9 - radiusBump);
        light.current.shadow.camera.far = maxRadius * (11 + radiusBump);
        light.current.shadow.camera.bottom = light.current.shadow.camera.left = -maxRadius * (1 + radiusBump);
        light.current.shadow.camera.right = light.current.shadow.camera.top = maxRadius * (1 + radiusBump);
        light.current.shadow.camera.updateProjectionMatrix();
      }
    }
  }, [ geometry ]);

  useEffect(() => {
    if (!!geometry) {
      let panTo = new Vector3(...position);
      panTo.negate();
      controls.targetScene.position.copy(panTo);
      controls.minDistance = asteroidData.radius * 1.2;
      controls.maxDistance = asteroidData.radius * 4.0;
      const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);
      controls.object.position.copy(zoomTo);
      camera.near = 100;
      camera.updateProjectionMatrix();
    }
  }, [ geometry ]);

  return (
    <group position={position} ref={group} >
      <directionalLight ref={light} />
      {!!geometry && !!materials && (
        <mesh
          material={materials}
          castShadow={shadows}
          receiveShadow={shadows}>
          <primitive attach="geometry" object={geometry} />
        </mesh>
      )}
    </group>
  );
};

export default Asteroid;
