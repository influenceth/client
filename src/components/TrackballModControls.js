import { forwardRef, useRef, useLayoutEffect, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import TrackballModControlsImpl from '~/lib/graphics/TrackballModControlsImpl';

export const TrackballModControls = forwardRef(({ children, ...props }, ref) => {
  const { camera, maxDistance } = props;
  const { gl, invalidate } = useThree();
  const defaultCamera = useThree(({ camera }) => camera);
  const explCamera = camera || defaultCamera;
  const [ controls ] = useState(() => new TrackballModControlsImpl(explCamera, gl.domElement))
  const group = useRef();

  if (maxDistance) controls.maxDistance = maxDistance;

  useLayoutEffect(() => {
    controls?.attach(group.current);
  }, [ children, controls ]);

  useEffect(() => {
    controls?.addEventListener('change', invalidate);

    return () => {
      controls?.removeEventListener('change', invalidate);
      controls?.dispose();
    };
  }, [ controls, invalidate ]);

  useFrame(() => {
    if (controls.enabled) controls.update();
  });

  return controls ? (
    <>
      <primitive ref={ref} dispose={undefined} object={controls} />
      <group ref={group}>
        {children}
      </group>
    </>
  ) : null
})
