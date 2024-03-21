import React, { useMemo } from 'react';
import styled from 'styled-components';
import { displayTimeFractionDigits } from '~/lib/utils';

const diamondDimension = 35;
const halfDimension = diamondDimension / 2;
const radius = 50 - halfDimension;

const Wrapper = styled.div`
  cursor: ${p => p.theme.cursors.active};
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

// TODO: this could presumably be improved using a radial gradient
// https://stackoverflow.com/a/21448994
const BlurCircle = styled.circle`
  fill: none;
  opacity: 0.25;
  stroke: white;
  stroke-width: ${1.4 * halfDimension}px;
`;

const TimeIcon = ({ time, motionBlur, ...props }) => {
  const position = useMemo(() => {
    const t = parseInt(time.substr(-displayTimeFractionDigits)) / Math.pow(10, displayTimeFractionDigits);
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
        {motionBlur
          ? <BlurCircle cx="50" cy="50" r={radius} />
          : <HandDiamond
              d={`M ${-halfDimension},0
              L 0,${halfDimension}
              L ${halfDimension},0
              L 0,${-halfDimension} z`}
              transform={`translate(${position.x},${position.y})`} />
        }
      </Svg>
    </Wrapper>
  );
}

export default TimeIcon;