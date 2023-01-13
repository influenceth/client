import Slider, { Range as RCRange } from 'rc-slider';
import 'rc-slider/assets/index.css';
import styled from 'styled-components';

const StyledSlider = styled(Slider)`
  height: 26px !important;
  margin: 0 20px;
  max-width: 360px;
  overflow-y: visible;
  padding: 13px 0 !important;

  & .rc-slider-handle {
    background-color: transparent;
    border: 1px solid rgba(${props => props.theme.colors.mainRGB}, 0.5);
    border-radius: 0px;
    cursor: ${props => props.theme.cursors.active};
    height: 18px;
    transform: rotate(45deg) translateX(-50%) translateY(25%) !important;
    width: 18px;

    &:before {
      background-color: ${p => p.theme.colors.mainText};
      border-radius: 50%;
      content: "";
      height: 8px;
      margin: 4px;
      position: absolute;
      width: 8px;
    }
  }

  & .rc-slider-tooltip {
    background-color: black;
    pointer-events: auto;
    z-index: 10000;
  }

  & .rc-slider-track {
    border-radius: 1px;
    height: 2px;
    background-color: ${props => props.theme.colors.main};
    box-shadow: 0 0 5px ${props => props.theme.colors.main};
  }

  & .rc-slider-rail {
    border-radius: 1px;
    height: 2px;
    background-color: ${props => props.theme.colors.mainText};
  }
`;

const Range = (props) => {
  const { type, ...restProps } = props;

  if (type === 'slider') return (<StyledSlider {...restProps} />);
  if (type === 'range') return (<RCRange {...restProps} />);
};

export default Range;
