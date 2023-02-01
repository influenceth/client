import { useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import NavIcon from './NavIcon';

const Wrapper = styled.div`
  margin: 0 -12px;
  overflow: hidden;
  padding: 0 12px;
  width: calc(100% + 24px);
`;

const Slider = styled.div`
  align-items: center;
  color: white;
  display: flex;
  height: 36px;
  position: relative;
  width: 100%;
  & * {
    pointer-events: none;
  }
`;

const Bar = styled.div`
  background: #444;
  border-radius: 3px;
  height: 5px;
  width: 100%;
`;

const InnerBar = styled.div.attrs(p => ({
  style: {
    width: `${p.value * 100}%`
  }
}))`
  background: ${p => p.theme.colors.main};
  border-radius: 3px;
  height: 100%;
`;

const Handle = styled.div.attrs(p => ({
  style: {
    left: `${p.value * 100}%`
  }
}))`
  position: absolute;
  left: 0;
  margin-left: -8px;
`;

const SliderInput = ({ min = 0, max = 1, increment = 1, value, onChange }) => {
  const sliderRef = useRef();
  const updating = useRef(false);

  const percentage = useMemo(() => (value - min) / (max - min), [value, min, max]) || 0;

  useEffect(() => {
    const mouseHandler = (e) => {
      if (e.type === 'mousedown') {
        updating.current = true;
      }
      if (updating.current && e.offsetX !== undefined) {
        onChange(Math.min(Math.max(min, min + (e.offsetX / sliderRef.current.offsetWidth) * (max - min)), max));
      }
      if (e.type === 'mouseup' || e.type === 'mouseleave') {
        updating.current = false;
      }
    };

    const keyHandler = (e) => {
      let incr = 0;
      if (e.code === 'ArrowLeft') incr = -increment;
      if (e.code === 'ArrowRight') incr = increment;
      if (incr !== 0) {
        if (max - min === 1) incr *= 0.01;
        onChange((v) => Math.min(Math.max(min, v + incr), max));
      }
    };

    sliderRef.current.addEventListener('mousedown', mouseHandler);
    sliderRef.current.addEventListener('mouseleave', mouseHandler);
    sliderRef.current.addEventListener('mousemove', mouseHandler);
    sliderRef.current.addEventListener('mouseup', mouseHandler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      if (sliderRef.current) {
        sliderRef.current.removeEventListener('mousedown', mouseHandler);
        sliderRef.current.removeEventListener('mouseleave', mouseHandler);
        sliderRef.current.removeEventListener('mousemove', mouseHandler);
        sliderRef.current.removeEventListener('mouseup', mouseHandler);
      }
      window.removeEventListener('keydown', keyHandler);
    }
  }, [increment, min, max]);

  return (
    <Wrapper>
      <Slider ref={sliderRef}>
        <Bar><InnerBar value={percentage} /></Bar>
        <Handle value={percentage}><NavIcon thicker selected selectedColor="white" /></Handle>
      </Slider>
    </Wrapper>
  );
}

export default SliderInput;
