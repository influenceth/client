import * as React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import TrackballModControlsImpl from '~/lib/TrackballModControlsImpl';

export const TrackballModControls = React.forwardRef(({ children, ...props }, ref) => {
  const { camera, maxDistance } = props;
  const gl = useThree(({ gl }) => gl);
  const defaultCamera = useThree(({ camera }) => camera);
  const invalidate = useThree(({ invalidate }) => invalidate);
  const explCamera = camera || defaultCamera;
  const [ controls ] = React.useState(() => new TrackballModControlsImpl(explCamera, gl.domElement))

  if (maxDistance) controls.maxDistance = maxDistance;

  const group = React.useRef();
  React.useLayoutEffect(() => controls?.attach(group.current), [ children, controls ]);

  useFrame(() => {
    if (controls.enabled) controls.update();
  });

  React.useEffect(() => {
    controls?.addEventListener?.('change', invalidate);
    return () => controls?.removeEventListener?.('change', invalidate);
  }, [ controls, invalidate ]);

  return controls ? (
    <>
      <primitive ref={ref} dispose={undefined} object={controls} />
      <group ref={group}>
        {children}
      </group>
    </>
  ) : null
})
