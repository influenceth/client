import Slider, { Range as RCRange } from 'rc-slider';
import 'rc-slider/assets/index.css';
import styled from 'styled-components';

const StyledSlider = styled(Slider)`
  & .rc-slider-handle {
    background-color: black;
    border: 2px solid ${props => props.theme.colors.main};
    cursor: ${props => props.theme.cursors.active};
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
