import { useState, useEffect, useRef } from 'react';
import { DataTexture, LessDepth, BufferGeometryLoader, MeshStandardMaterial, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { useThrottle } from '@react-hook/throttle';
import gsap from 'gsap';
import { KeplerianOrbit } from 'influence-utils';

// eslint-disable-next-line
import Worker from 'worker-loader!../../worker';
import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import TextureRenderer from '~/lib/graphics/TextureRenderer';
import CubeSphere from '~/lib/graphics/CubeSphere';
import { getNearbyFibPoints } from '~/lib/graphics/fiboUtils';
import Config from './asteroid/Config';
import HeightMap from './asteroid/HeightMap';
import ColorMap from './asteroid/ColorMap';
import NormalMap from './asteroid/NormalMap';
import Rings from './asteroid/Rings';
import constants from '~/lib/constants';

// Setup worker or main thread textureRenderer depending on browser
let worker, textureRenderer;

if (!!window.Worker && typeof OffscreenCanvas !== 'undefined') {
  worker = new Worker();
} else {
  textureRenderer = new TextureRenderer();
}

const NEARBY_LOTS_TO_RENDER = 20;  // TODO: set this back to 12 - 20 range
const nullNearMouseLots = Array.from(Array(NEARBY_LOTS_TO_RENDER)).map(() => new Vector3(0.0));

const Asteroid = (props) => {
  const controls = useThree(({ controls }) => controls);
  const origin = useStore(s => s.asteroids.origin);
  const time = useStore(s => s.time.current);
  const mapSize = useStore(s => s.graphics.textureSize);
  const shadows = useStore(s => s.graphics.shadows);
  const shadowSize = useStore(s => s.graphics.shadowSize);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomedFrom = useStore(s => s.asteroids.zoomedFrom);
  const updateZoomStatus = useStore(s => s.dispatchZoomStatusChanged);
  const setZoomedFrom = useStore(s => s.dispatchAsteroidZoomedFrom);
  const { data: asteroidData } = useAsteroid(origin);

  const group = useRef();
  const light = useRef();
  const mesh = useRef();
  const lotMesh = useRef();
  const asteroidOrbit = useRef();
  const rotationAxis = useRef();

  const [ config, setConfig ] = useState();
  const [ geometry, setGeometry ] = useState();
  const [ maps, setMaps ] = useState();
  const [ materials, setMaterials ] = useState();
  const [ mousePos, setMousePos ] = useThrottle(null, 30);
  const [ mouseIntersect, setMouseIntersect ] = useState();
  const [ nearMouseLots, setNearMouseLots ] = useState();
  const [ position, setPosition ] = useState([ 0, 0, 0 ]);
  const [ rotation, setRotation ] = useState(0);

  // Positions the asteroid in space based on time changes
  useEffect(() => {
    if (!!asteroidData && !asteroidOrbit.current) asteroidOrbit.current = new KeplerianOrbit(asteroidData.orbital);
    if (!asteroidData) asteroidOrbit.current = null;

    if (asteroidOrbit.current && time) {
      setPosition(Object.values(asteroidOrbit.current.getPositionAtTime(time)).map(v => v * constants.AU));
    }

    if (mesh.current && config && time) {
      setRotation(time * config.rotationSpeed * 2 * Math.PI);
    }
  }, [ asteroidData, config, time ]);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
    }
    if (lotMesh.current) {
      lotMesh.current.setRotationFromAxisAngle(rotationAxis.current, rotation);
    }
  }, [rotation]);

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
      setNearMouseLots(null);
      // TODO: any other lot-related cleanup?

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
    if (!geometry || !asteroidData) return;
    const posVec = new Vector3(...position);
    light.current.intensity = constants.STAR_INTENSITY / (posVec.length() / constants.AU);
    light.current.position.copy(posVec.clone().normalize().negate().multiplyScalar(asteroidData.radius * 10));
    geometry.computeBoundingSphere();
    const maxRadius = geometry.boundingSphere.radius + geometry.boundingSphere.center.length();
    const radiusBump = config?.ringsPresent ? 1.5 : 0;

    if (shadows) {
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

  useEffect(() => {
    if (mousePos && mousePos.intersections?.length > 0) {
      var intersection = new Vector3();
      intersection.copy(mousePos.intersections[0].point);
      intersection.applyAxisAngle(rotationAxis.current, -1 * rotation);

      const lots = Math.floor(4 * Math.PI * config.radius * config.radius / 1e6);
      const nearbyFibPoints = getNearbyFibPoints(intersection.normalize(), lots, asteroidData.radius, NEARBY_LOTS_TO_RENDER);
      while (nearbyFibPoints.length < NEARBY_LOTS_TO_RENDER) {
        nearbyFibPoints.push(new Vector3(0.0));
      }

      setMouseIntersect(intersection);
      setNearMouseLots(nearbyFibPoints.map((p) => p.normalize()));
    } else {
      setMouseIntersect(null);
      setNearMouseLots(null);
    }
  }, [mousePos]);

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
      {geometry && (
        <mesh
          ref={lotMesh}
          onPointerMove={setMousePos}
          onPointerOut={setMousePos}
          scale={1.01}>
          <primitive attach="geometry" object={geometry} />
          <shaderMaterial attach="material" args={[{
              transparent: true,
              uniforms: {
                uMouse: { type: 'v', value: mouseIntersect || new Vector3(0.0) },
                uMouseIn: { type: 'b', value: !!mouseIntersect },
                uNearbyLots: { type: 'v', value: nearMouseLots || nullNearMouseLots }
              },
              vertexShader: `
                varying vec3 vPosition;

                void main() {
                  vPosition = position;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                varying vec3 vPosition;

                uniform vec3 uMouse;
                uniform bool uMouseIn;
                uniform vec3 uNearbyLots[${NEARBY_LOTS_TO_RENDER}];

                float mouseHighlightWidth = 0.5; // TODO: should calculate based on asteroid size

                struct ClosestLotInfo {
                  int index;
                  float distance;
                };

                ClosestLotInfo closestLot(vec3 testPosition) {
                  int closestPoint = -1;
                  float minDist = -1.0;
                  for (int i = 0; i < ${NEARBY_LOTS_TO_RENDER}; i++) {
                    if (length(uNearbyLots[i]) > 0.0) {
                      float testDist = distance(testPosition, uNearbyLots[i]);
                      if (minDist < 0.0 || testDist < minDist) {
                        minDist = testDist;
                        closestPoint = i;
                      }
                    }
                  }
                  return ClosestLotInfo(closestPoint, minDist);
                }

                void calcClosestLots(inout ClosestLotInfo closest[2], vec3 testPosition) {
                  for (int i = 0; i < ${NEARBY_LOTS_TO_RENDER}; i++) {
                    if (length(uNearbyLots[i]) > 0.0) {
                      float testDist = distance(testPosition, uNearbyLots[i]);
                      if (closest[0].distance < 0.0 || testDist < closest[0].distance) {
                        closest[1] = closest[0];
                        closest[0].index = i;
                        closest[0].distance = testDist;
                      } else if (closest[1].distance < 0.0 || testDist < closest[1].distance) {
                        closest[1].index = i;
                        closest[1].distance = testDist;
                      }
                    }
                  }
                }

                vec4 tileByClosest(float mDist, vec3 uv) {
                  ClosestLotInfo lot = closestLot(uv);

                  float minMouseRadius = 0.85 * mouseHighlightWidth;
                  float maxMouseRadius = mouseHighlightWidth;

                  float alphaMax = 0.8 - (clamp(mDist, minMouseRadius, maxMouseRadius) - minMouseRadius) / (maxMouseRadius - minMouseRadius);
                  
                  // TODO: if not using these, can remove mins calc and the uniform
                  //  (unless need for asteroid radius scaling)
                  return vec4(
                    lot.index == 0 ? 0.8 : 0.0,
                    lot.index == 0 ? 0.8 : 0.0,
                    lot.index == 0 ? 1.0 : 1.0 / float(lot.index),
                    lot.index == 0 ? 1.0 : alphaMax
                    //1.0 - pow(float(lot.index)/float(${NEARBY_LOTS_TO_RENDER-12}), 2.0)
                  );
                }

                vec4 outlineByClosest(float mDist, vec3 uv) {
                  ClosestLotInfo lots[2] = ClosestLotInfo[2](
                    ClosestLotInfo(-1, -1.0),
                    ClosestLotInfo(-1, -1.0)
                  );

                  calcClosestLots(lots, uv);
                    
                  float minMouseRadius = 0.5 * mouseHighlightWidth;
                  float maxMouseRadius = mouseHighlightWidth;

                  float alphaMax = 0.8 - (clamp(mDist, minMouseRadius, maxMouseRadius) - minMouseRadius) / (maxMouseRadius - minMouseRadius);

                  // if near border between tiles, color as line
                  float distanceFromNextLot = lots[1].distance - lots[0].distance;
                  if (distanceFromNextLot < 0.015) {
                    if (lots[0].index == 0) {
                      return vec4(0.21, 0.65, 0.8, 0.8);
                    }
                    float fade = min(1.0, pow(68.0 * distanceFromNextLot, 2.0) + 0.3);
                    return vec4(0.0, 0.0, 1.0, min(alphaMax, 1.0) * fade);

                  // if nearest mouse tile, color as highlighted
                  } else if (lots[0].index == 0) {
                    return vec4(0.4, 0.4, 1.0, 0.2);
                  }

                  return vec4(0.0);
                }

                void main() {
                  gl_FragColor = vec4(0.0);
                  if (uMouseIn) {
                    vec3 p = normalize(vPosition);
                    vec3 m = normalize(uMouse);
                    float mDist = distance(p, m);
                    if (mDist < mouseHighlightWidth) {
                      
                      // mark the y-poles for debugging
                      //if (p.y > 0.9) {
                      //  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
                      //} else if(p.y < -0.9) {
                      //  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                      // mark the lot centers
                      //if (lot.distance < 0.02) {
                      //  gl_FragColor = vec4(1.0);
                      //} else {
                      //  gl_FragColor = tileByClosest(mDist, p);
                          gl_FragColor = outlineByClosest(mDist, p);
                      //}


                    }
                  }
                }
              `
          }]} />
        </mesh>
      )}
      {config?.ringsPresent && geometry && (
        <Rings
          receiveShadow={shadows}
          config={config}
          onUpdate={(m) => m.lookAt(rotationAxis?.current)} />
      )}
    </group>
  );
};

export default Asteroid;
