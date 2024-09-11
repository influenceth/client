import { useCallback, useEffect, useState } from '~/lib/react-debug';
import { useThree } from '@react-three/fiber';

import { EffectComposer, SelectiveBloom } from '@react-three/postprocessing'
import { Resizer, KernelSize } from 'postprocessing';

import useInterval from '~/hooks/useInterval';

export const BLOOM_LAYER = 10;

const defaultBloomParams = {
  strength: 5,
  radius: KernelSize.LARGE,
  smoothing: 0.025,
  threshold: 0,
};

// TODO: problems:
//  bloom not consistent between colors
//  bloom seems to be happening on asteroid chunks even though not in layer

// TODO:
//  - register/unregister lights (instead of searching scene for them)
//  - star is missing when zoomed out
//  - where should tonemapping overrides happen?
// TODO: patch package to ignore background
const Postprocessor = ({ enabled, bloomParams = defaultBloomParams }) => {
  const { scene } = useThree();
  const [lights, setLights] = useState([]);

  const resetLights = useCallback(import.meta.url, () => {
    const l = [];
    scene.traverse((obj) => {
      if (obj.isLight) {
        l.push(obj);
      }
    });
    // console.log('lights', l);
    setLights(l);
  }, []);
  useEffect(import.meta.url, () => resetLights(), []);

  useInterval(() => {
    resetLights();
  }, 3000);

  return (
    <>
      <EffectComposer enabled>
        <SelectiveBloom
          lights={lights} // ⚠️ REQUIRED! all relevant lights
          selectionLayer={BLOOM_LAYER} // selection layer
          intensity={bloomParams.strength} // The bloom intensity.
          width={Resizer.AUTO_SIZE} // render width
          height={Resizer.AUTO_SIZE} // render height
          kernelSize={bloomParams.radius || KernelSize.LARGE} // blur kernel size
          luminanceThreshold={0.0001/*bloomParams.threshold*/} // luminance threshold. Raise this value to mask out darker elements in the scene.
          luminanceSmoothing={bloomParams.smoothing} // smoothness of the luminance threshold. Range is [0, 1]
        />
      </EffectComposer>
    </>
  );
};

export default Postprocessor;