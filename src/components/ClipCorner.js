import styled, { keyframes } from 'styled-components';

const Corner = styled.svg`
  bottom: -1px;
  height: ${p => p.dimension}px;
  margin-right: 0;
  position: absolute;
  right: -1px;
  stroke: ${p => p.color || 'currentColor'};
  stroke-width: 2px;
  width: ${p => p.dimension}px;
`;

const ClipCorner = ({ color, dimension }) => (
  <Corner xmlns="http://www.w3.org/2000/svg"
    color={color}
    dimension={dimension}
    viewBox={`0 0 ${dimension} ${dimension}`}>
    <line x1="0" y1={dimension} x2={dimension} y2="0" />
  </Corner>
);

export default ClipCorner;
    