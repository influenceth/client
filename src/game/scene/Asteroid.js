import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataTexture, LessDepth, BufferGeometryLoader, MeshStandardMaterial, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { KeplerianOrbit } from 'influence-utils';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import constants from '~/lib/constants';
import TextureRenderer from '~/lib/graphics/TextureRenderer';
import CubeSphere from '~/lib/graphics/CubeSphere';
import Buildings from './asteroid/Buildings';
import ColorMap from './asteroid/ColorMap';
import Config from './asteroid/Config';
import exportModel from './asteroid/export';
import HeightMap from './asteroid/HeightMap';
import AsteroidLots from './asteroid/Lots';
import NormalMap from './asteroid/NormalMap';
import Rings from './asteroid/Rings';

// Setup worker or main thread textureRenderer depending on browser
let worker, textureRenderer;

if (!!window.Worker && typeof OffscreenCanvas !== 'undefined') {
  worker = new Worker();
} else {
  textureRenderer = new TextureRenderer();
}

const Asteroid = (props) => {
  const controls = useThree(({ controls }) => controls);
  const origin = useStore(s => s.asteroids.origin);
  const time = useStore(s => s.time.current);
  const mapSize = useStore(s => s.graphics.textureSize);
  const shadows = useStore(s => s.graphics.shadows);
  const shadowSize = useStore(s => s.graphics.shadowSize);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const lotSelectionEnabled = useStore(s => s.asteroids.lotSelectionMode);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const requestingModelDownload = useStore(s => s.asteroids.requestingModelDownload);
  const onModelDownload = useStore(s => s.dispatchModelDownloadComplete);
  const { data: asteroidData } = useAsteroid(origin);

  const group = useRef();
  const light = useRef();
  const mesh = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();
  const previousTime = useRef();

  const [ config, setConfig ] = useState();
  const [ geometry, setGeometry ] = useState();
  const [ maps, setMaps ] = useState();
  const [ materials, setMaterials ] = useState();
  const [ position, setPosition ] = useState([ 0, 0, 0 ]);
  const [ rotation, setRotation ] = useState(0);

  // Positions the asteroid in space based on time changes
  useEffect(() => {
    if (!!asteroidData && !asteroidOrbit.current) asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
    if (!asteroidData) asteroidOrbit.current = null;

    if (asteroidOrbit.current && time) {
      setPosition(Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU));
    }

    if (config && time) {
      setRotation(time * config.rotationSpeed * 2 * Math.PI);
    }
  }, [ asteroidData, config, time ]);

  // NOTE: if make changes in the below block, also update asteroid/lots.js for consistency
  const meshReady = !!mesh.current;
  useEffect(() => {
    if (mesh.current) {
      mesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
    }
  }, [rotation, meshReady]);

  useEffect(() => {
    if (!lotSelectionEnabled) {
      previousTime.current = null;
    }
  }, [lotSelectionEnabled]);

  useEffect(() => {
    if (config && controls && time && lotSelectionEnabled) {
      if (rotationAxis.current && previousTime.current) {
        const zoomTo = controls.object.position.clone();
        zoomTo.applyAxisAngle(rotationAxis.current, (time - previousTime.current) * config.rotationSpeed * 2 * Math.PI);
        controls.object.position.copy(zoomTo);
        controls.object.updateProjectionMatrix();
      }
      previousTime.current = time;
    }
  }, [config, controls, time, lotSelectionEnabled])

  // Update texture generation config when new asteroid data is available
  useEffect(() => {
    if (!!asteroidData) setConfig(new Config(asteroidData));

    // Cleanup when there's no data
    // TODO: if can ever jump directly between asteroids, this cleanup will need to happen on asteroid change as well
    if (!asteroidData) {
      setConfig(null);

      geometry?.dispose();
      setGeometry(null);

      materials?.forEach(m => {
        m.map?.dispose();
        m.normalMap?.dispose();
      });

      setMaterials(null);
      setBuildings([]);

      if (zoomStatus === 'in') updateZoomStatus('zooming-out');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroidData ]);

  // Kicks off rendering of each map based on the asteroid's unique config either in worker or main
  useEffect(() => {
    if (!config || !mapSize) return;

    rotationAxis.current = config.seed.clone().normalize();

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
      setGeometry(geometry);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ maps ]);

  // Receives the updated maps and applies them to the material
  useEffect(() => {
    if (!maps) return;

    const processed = {};
    const materials = [];

    Object.keys(maps).forEach(k => {
      if (['colorMap', 'normalMap'].includes(k)) {
        processed[k] = maps[k].map(m => {
          const tex = new DataTexture(m.buffer, m.width, m.height, m.format);
          return Object.assign(tex, m.options);
        });
      }
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

  // Configures the light component once the geometry is created
  useEffect(() => {
    if (!geometry || !asteroidData || !light.current) return;

    const posVec = new Vector3(...position);
    light.current.intensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    light.current.position.copy(posVec.clone().normalize().negate().multiplyScalar(asteroidData.radius * 10));
    geometry.computeBoundingSphere();

    if (shadows) {
      const maxRadius = geometry.boundingSphere.radius + geometry.boundingSphere.center.length();
      const radiusBump = config?.ringsPresent ? 1.5 : 0;
      light.current.shadow.camera.near = maxRadius * 9;
      light.current.shadow.camera.far = maxRadius * (11 + radiusBump);
      light.current.shadow.camera.bottom = light.current.shadow.camera.left = -maxRadius;
      light.current.shadow.camera.right = light.current.shadow.camera.top = maxRadius;
      light.current.shadow.camera.updateProjectionMatrix();
    }
  }, [ geometry, asteroidData, position, shadows, shadowSize, config?.ringsPresent ]);

  // Zooms the camera to the correct location
  const shouldZoomIn = zoomStatus === 'zooming-in' && controls && !!asteroidData;
  useEffect(() => {
    if (!shouldZoomIn) return;

    setZoomedFrom({
      scene: controls.targetScene.position.clone(),
      position: controls.object.position.clone(),
      up: controls.object.up.clone()
    });

    const panTo = new Vector3(...position);
    group.current?.position.copy(panTo);
    panTo.negate();
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);

    const timeline = gsap.timeline({
      defaults: { duration: 2, ease: 'power4.out' },
      onComplete: () => updateZoomStatus('in')
    });

    // Pan the target scene to center the asteroid
    timeline.to(controls.targetScene.position, { ...panTo }, 0);

    // Zoom in the camera to the asteroid
    timeline.to(controls.object.position, { ...zoomTo }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldZoomIn ]);

  const shouldFinishZoomIn = zoomStatus === 'in' && controls && !!asteroidData;
  useEffect(() => {
    if (!shouldFinishZoomIn) return;

    // Update distances to maximize precision
    controls.minDistance = asteroidData.radius * 1.2;
    controls.maxDistance = asteroidData.radius * 4.0;

    const panTo = new Vector3(...position);
    group.current?.position.copy(panTo);
    panTo.negate();
    const zoomTo = controls.object.position.clone().normalize().multiplyScalar(asteroidData.radius * 2.0);
    controls.targetScene.position.copy(panTo);
    controls.object.position.copy(zoomTo);
    controls.noPan = true;
    controls.object.near = 100;
    controls.object.updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldFinishZoomIn, asteroidData ]);

  // Handle zooming back out
  const shouldZoomOut = zoomStatus === 'zooming-out' && zoomedFrom && controls;
  useEffect(() => {
    if (!shouldZoomOut) return;

    controls.minDistance = 0;
    controls.maxDistance = 10 * constants.AU;

    const timeline = gsap.timeline({
      defaults: { duration: 2, ease: 'power4.in' },
      onComplete: () => {
        controls.targetScene.position.copy(zoomedFrom.scene);
        controls.object.position.copy(zoomedFrom.position);
        controls.object.up.copy(zoomedFrom.up);
        controls.noPan = false;
        controls.object.near = 1000000;
        controls.object.updateProjectionMatrix();
        updateZoomStatus('out');
      }
    });

    // Pan the scene back to the original orientation
    timeline.to(controls.targetScene.position, { ...zoomedFrom.scene }, 0);

    // Zoom the camera out and put it right side up
    timeline.to(controls.object.position, { ...zoomedFrom.position }, 0);
    timeline.to(controls.object.up, { ...zoomedFrom.up }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldZoomOut ]);

  // Updates controls and scene position when time or asteroid changes
  const shouldUpdatePosition = zoomStatus === 'in' && position && controls;
  useEffect(() => {
    if (!shouldUpdatePosition) return;

    let panTo = new Vector3(...position);
    group.current?.position.copy(panTo);
    panTo.negate();
    controls.targetScene.position.copy(panTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ shouldUpdatePosition, position, asteroidData ]);

  // Initiates download of generated mesh (when requested and ready)
  const exportableMesh = geometry && materials && mesh && mesh.current;
  useEffect(() => {
    if (!requestingModelDownload && exportableMesh) return;  
    exportModel(exportableMesh, onModelDownload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestingModelDownload, exportableMesh]);

  const lotCount = useMemo(() => {
    if (config?.radius) {
      return Math.floor(4 * Math.PI * config.radius * config.radius / 1e6);
    }
    return null;
  }, [config?.radius]);

  const lookAtPosition = useCallback((position) => {
    if (controls?.object?.position) {
      const zoomTo = position
        .clone()
        .normalize()
        .multiplyScalar(controls.object.position.length())  // maintain same distance
        .applyAxisAngle(rotationAxis.current, rotation);    // keep up with rotation
      
      const timeline = gsap.timeline({
        defaults: { duration: 1, ease: 'power4.out' },
      });
      timeline.to(controls.object.position, { ...zoomTo }, 0);
    }
  }, [controls?.object?.position, rotation]);

  const [buildings, setBuildings] = useState([]);
  const onLotClick = useCallback((lotIndex, lotPosition) => {
    if (!!buildings.find((b) => b.lot === lotIndex)) {
      setBuildings(buildings.filter((b) => b.lot !== lotIndex));
    } else {
      setBuildings([...buildings, { lot: lotIndex }]);
    }
    lookAtPosition(lotPosition);
  }, [buildings, lookAtPosition]);

  return (
    <group ref={group}>
      <directionalLight
        ref={light}
        color={0xffeedd}
        castShadow={shadows}
        shadow-mapSize-height={shadowSize}
        shadow-mapSize-width={shadowSize} />
      {geometry && materials && (
        <mesh
          ref={mesh}
          material={materials}
          castShadow={shadows}
          receiveShadow={shadows}>
          <primitive attach="geometry" object={geometry} />
        </mesh>
      )}
      {geometry && lotSelectionEnabled && (
        <AsteroidLots
          geometry={geometry}
          lotCount={lotCount}
          onClick={onLotClick}
          radius={config.radius}
          rotation={rotation}
          rotationAxis={rotationAxis?.current}
        />
      )}
      {geometry && mesh.current && buildings && buildings.length > 0 && (
        <Buildings
          buildings={buildings}
          surface={mesh.current}
          radius={config.radius}
          lotCount={lotCount}
          rotation={rotation}
          rotationAxis={rotationAxis?.current}
        />
      )}
      {geometry && config?.ringsPresent && (
        <Rings
          receiveShadow={shadows}
          config={config}
          onUpdate={(m) => m.lookAt(rotationAxis?.current)} />
      )}
    </group>
  );
};

export default Asteroid;
