import styled from 'styled-components';

const Svg = styled.svg`
  height: 100%;
  left: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 1;
`;

// // to generate path:
// const size = 400;  // should match viewBox
// const cellSize = size / 20;
// let path = '';
// for (let x = cellSize; x < size; x += cellSize) {
//   path += `M ${x} 0 V ${size}`;
// }
// for (let y = cellSize; y < size; y += cellSize) {
//   path += `M 0 ${y} H ${size}`;
// }
// console.log(path);

// TODO: could also have this drawn into canvas
const Grid = () => (
  <Svg viewBox="0 0 400 400">
    <path
      d="M 20 0 V 400M 40 0 V 400M 60 0 V 400M 80 0 V 400M 100 0 V 400M 120 0 V 400M 140 0 V 400M 160 0 V 400M 180 0 V 400M 200 0 V 400M 220 0 V 400M 240 0 V 400M 260 0 V 400M 280 0 V 400M 300 0 V 400M 320 0 V 400M 340 0 V 400M 360 0 V 400M 380 0 V 400M 0 20 H 400M 0 40 H 400M 0 60 H 400M 0 80 H 400M 0 100 H 400M 0 120 H 400M 0 140 H 400M 0 160 H 400M 0 180 H 400M 0 200 H 400M 0 220 H 400M 0 240 H 400M 0 260 H 400M 0 280 H 400M 0 300 H 400M 0 320 H 400M 0 340 H 400M 0 360 H 400M 0 380 H 400"
      stroke="rgba(255, 255, 255, 0.1)"
      strokeWidth="1" />
  </Svg>
);

export default Grid;