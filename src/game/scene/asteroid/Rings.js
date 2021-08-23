import { useEffect, useState } from 'react';
import {
  Color,
  Vector3,
  LinearMipMapLinearFilter,
  LinearFilter,
  RGBAFormat,
  DataTexture,
  DoubleSide,
  RingGeometry
} from 'three';

import useStore from '~/hooks/useStore';

const Rings = (props) => {
  const { config, ...restProps } = props;
  const [ geometry, setGeometry ] = useState();
  const [ texture, setTexture ] = useState();

  const shadows = useStore(s => s.graphics.shadows);

  useEffect(() => {
    const size = 512;
    const data = new Uint8Array(size * size * 4); // 1 by 256 pixels
    const variation = config.ringsVariation;

    for (let i = 0; i < (size * size); i++) {
      const x = Math.floor(i / size);
      const level = Math.floor(256 * (variation[x] + 1) / 2);
      const colorMod = (variation[x + 512] + 1) / 2;
      const stride = i * 4;
      const color = new Color(0xa1afb5);
      data[stride] = (color.r + (colorMod * (1 - color.r))) * 255;
      data[stride + 1] = (color.g + (colorMod * (1 - color.g))) * 255;
      data[stride + 2] = (color.b + (colorMod * (1 - color.b))) * 255;
      data[stride + 3] = level;
    }

    const ringsTexture = new DataTexture(data, size, size, RGBAFormat);
    ringsTexture.generateMipmaps = true;
    ringsTexture.minFilter = LinearMipMapLinearFilter;
    ringsTexture.magFilter = LinearFilter;
    ringsTexture.needsUpdate = true;
    const [ ringsMin, ringsMax ] = config.ringsMinMax;
    const ringsGeometry = new RingGeometry(ringsMin, ringsMax, 100, 16);
    const ringPos = ringsGeometry.attributes.position;
    var v3 = new Vector3();
    let newUvx;

    for (let i = 0; i < ringPos.count; i++){
      v3.fromBufferAttribute(ringPos, i);
      newUvx = (v3.length() - ringsMin) / (ringsMax - ringsMin);
      ringsGeometry.attributes.uv.setXY(i, 0, newUvx);
    }

    setGeometry(ringsGeometry);
    setTexture(ringsTexture);
  }, []);

  return (
    <mesh {...restProps}>
      {geometry && <primitive attach="geometry" object={geometry} />}
      <meshPhongMaterial
        emissive={0xffffff}
        emissiveIntensity={0.05}
        map={texture}
        side={DoubleSide}
        transparent />
    </mesh>
  );
};

export default Rings;
