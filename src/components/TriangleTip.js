const TriangleTip = ({ extendStroke, fillColor, strokeColor, strokeWidth, rotate }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    viewBox={`0 0 100 ${50 + strokeWidth / 2}`}
    preserveAspectRatio="none"
    style={rotate ? { transform: `rotate(${rotate}deg)` } : {}}>
    <polygon
      fill={fillColor}
      points="0,0 100,0 50,50 0,0"
      strokeWidth="0" />
    <path
      d={extendStroke ? `M-10 -5 L50 50 L110 -5` : `M0 0 L50 50 L100 0`}
      fill="transparent"
      stroke={strokeColor}
      stroke-alignment="outer"
      strokeWidth={strokeWidth} />
  </svg>
);

export default TriangleTip;