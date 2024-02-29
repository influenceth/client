import styled from 'styled-components';

const Corner = styled.svg`
  bottom: ${p => -1 - p.offset}px;
  height: ${p => p.dimension}px !important;
  margin-right: 0;
  position: absolute;
  ${p => p.flip ? `left: ${-1 - p.offset}px;` : `right: ${-1 - p.offset}px;`}
  stroke: ${p => p.color || 'currentColor'};
  stroke-width: 2px;
  width: ${p => p.dimension}px !important;
`;

const ClipCorner = ({ color, dimension, flip, offset = 0 }) => (
  <Corner xmlns="http://www.w3.org/2000/svg"
    color={color}
    dimension={dimension}
    flip={flip}
    offset={offset}
    viewBox={`0 0 ${dimension} ${dimension}`}>
    {flip
      ? <line x1="0" y1="0" x2={dimension} y2={dimension} />
      : <line x1="0" y1={dimension} x2={dimension} y2="0" />
    }
  </Corner>
);

export default ClipCorner;
    