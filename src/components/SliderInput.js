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

const SliderInput = ({ min = 0, max = 1, value, onChange }) => {
  const sliderRef = useRef();
  const updating = useRef(false);

  const percentage = useMemo(() => (value - min) / (max - min), [value, min, max]);

  const mouseHandler = useCallback((e) => {
    if (e.type === 'mouseup' || e.type === 'mouseleave') {
      updating.current = false;
      return;
    } else if (e.type === 'mousedown') {
      updating.current = true;
    }
    if (updating.current && e.offsetX !== undefined) {
      onChange(min + (e.offsetX / sliderRef.current.offsetWidth) * (max - min));
    }
  }, []);

  const keyHandler = useCallback((e) => {
    console.log('e', e)
    let incr = 0;
    if (e.code === 'ArrowLeft') incr = -1;
    if (e.code === 'ArrowRight') incr = 1;
    if (incr !== 0) {
      if (max - min === 1) incr *= 0.01;
      onChange((v) => v + incr);
    }
  }, [value]);

  useEffect(() => {
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
  }, []);

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
