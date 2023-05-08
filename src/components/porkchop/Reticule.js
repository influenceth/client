import styled from 'styled-components';

const Selector = styled.svg`
  height: 200%;
  left: 0;
  margin-left: -100%;
  margin-top: -100%;
  pointer-events: none;
  position: absolute;
  top: 0;
  transition: opacity 250ms ease;
  width: 200%;
  z-index: 1;
`;

const size = 2000;
const reticuleWidth = 60;
const reticuleStroke = 5;
const centerDotRadius = 6;
const invalidColor = 'red';
const reticuleColor = 'white';
const lineColor = 'rgba(255,255,255,0.6)';
const lineWidth = 3;
const crosshairSize = 15;

const Reticule = ({ center, fade, invalid, selected }) => {
  if (!center) return null;

  return (
    <Selector
      viewBox={`0 0 ${size} ${size}`}
      selected={selected}
      style={{
        left: `${100 * center.x}%`,
        opacity: fade ? 0.5 : 1,
        top: `${100 * center.y}%`,
      }}>

      {/* horizontal and vertical lines */}
      <path
        d={`
          M 0 ${size / 2}
          H ${(size - reticuleWidth) / 2}
          m ${reticuleWidth} 0
          H ${size}

          M ${size / 2} 0
          V ${(size - reticuleWidth) / 2}
          m 0 ${reticuleWidth}
          V ${size}
        `}
        stroke={lineColor}
        strokeWidth={lineWidth} />

      {/* diagonal line */}
      {selected && (
        <path
          d={`
            M 0 0
            L ${(size - reticuleWidth) / 2} ${(size - reticuleWidth) / 2}
            M ${(size + reticuleWidth) / 2} ${(size + reticuleWidth) / 2}
            L ${size} ${size}
          `}
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeDasharray={12}
        />
      )}

      {/* crosshairs on reticule */}
      <path
        d={`
          M ${(size - reticuleWidth) / 2} ${size / 2}
          h -${crosshairSize}
          M ${(size + reticuleWidth) / 2} ${size / 2}
          h ${crosshairSize}

          M ${size / 2} ${(size - reticuleWidth) / 2}
          v -${crosshairSize}
          M ${size / 2} ${(size + reticuleWidth) / 2}
          v ${crosshairSize}
        `}
        stroke={invalid ? invalidColor : reticuleColor}
        strokeWidth={reticuleStroke}
      />

      {/* innermost rectangle */}
      <rect
        x={(size - reticuleWidth) / 2}
        y={(size - reticuleWidth) / 2}
        width={reticuleWidth}
        height={reticuleWidth}
        fill="transparent"
        stroke={invalid ? invalidColor : reticuleColor}
        strokeWidth={reticuleStroke}
      />

      {/* innermost dot */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={centerDotRadius}
        fill={reticuleColor}
      />
    </Selector>
  );
};

export default Reticule;