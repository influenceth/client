import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

import NavIcon from './NavIcon';

const ANIMATION_TIME = 750;

const Wrapper = styled.div`
  margin: 0 -12px;
  overflow: hidden;
  padding: 0 12px;
  width: calc(100% + 24px);
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
  ${p => p.animating && `
    ${InnerBar} {
      transition: width ${ANIMATION_TIME}ms ease;
    }
    ${Handle} {
      transition: left ${ANIMATION_TIME}ms ease;
    }
  `}
`;

const SliderInput = ({ min = 0, max = 1, increment = 1, value, onChange }) => {
  const sliderRef = useRef();
  const updating = useRef(false);
  const expectedChange = useRef();

  const handleChange = (newValue) => {
    expectedChange.current = newValue;
    onChange(newValue);
  }

  useEffect(() => {
    const mouseHandler = (e) => {
      if (e.type === 'mousedown') {
        updating.current = true;
      }
      if (updating.current && e.offsetX !== undefined) {
        handleChange(Math.min(Math.max(min, min + (e.offsetX / sliderRef.current.offsetWidth) * (max - min)), max));
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
        handleChange((v) => Math.min(Math.max(min, v + incr), max));
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
  }, [increment, min, max, handleChange]);

  const percentage = useMemo(() => Math.max(0, Math.min(100, (value - min) / (max - min))), [value, min, max]) || 0;
  return (
    <Wrapper>
      <Slider ref={sliderRef} animating={expectedChange.current !== value}>
        <Bar><InnerBar value={percentage} /></Bar>
        <Handle value={percentage}><NavIcon thicker selected selectedColor="white" /></Handle>
      </Slider>
    </Wrapper>
  );
}

export default SliderInput;
