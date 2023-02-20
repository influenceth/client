import React, { useMemo } from 'react';
import styled from 'styled-components';
import { DISPLAY_TIME_FRACTION_DIGITS } from '~/contexts/ClockContext';

const diamondDimension = 35;
const halfDimension = diamondDimension / 2;
const radius = 50 - halfDimension;
const rounding = 2;

const Wrapper = styled.div`
  height: ${p => p.size};
  overflow: visible;
  position: relative;
  transform: rotate(-90deg); /* to put 0 at 12 o'clock */
  transform-origin: center center;
  width: ${p => p.size};
`;

const Svg = styled.svg`
  height: 100%;
  width: 100%;
`;

const HandDiamond = styled.path`
  fill: white;
  stroke: black;
  stroke-width: 2px;
`;
const OuterCircle = styled.circle`
  fill: none;
  stroke: ${p => p.theme.colors.main};
  stroke-width: ${radius * 0.05}px;
`;

const TimeIcon = ({ time, ...props }) => {
  const position = useMemo(() => {
    const t = parseInt(time.substr(-DISPLAY_TIME_FRACTION_DIGITS)) / Math.pow(10, DISPLAY_TIME_FRACTION_DIGITS);
    if (isNaN(t)) return { x: -100, y: -100 };
    const theta = 2 * Math.PI * t;
    return {
      x: 50 + radius * Math.cos(theta),
      y: 50 + radius * Math.sin(theta)
    }
  }, [time]);
  return (
    <Wrapper size={props.size || '2em'} {...props}>
      <Svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 100 100">
        <OuterCircle cx="50" cy="50" r={radius} />
        <g transform={`translate(${position.x},${position.y})`}>
          <HandDiamond
            fill="red"
            d={`M ${-halfDimension},0
            L 0,${halfDimension}
            L ${halfDimension},0
            L 0,${-halfDimension} z`} />
        </g>
      </Svg>
    </Wrapper>
  );
}

export default TimeIcon;