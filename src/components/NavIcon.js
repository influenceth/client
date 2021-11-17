import React from 'react';
import {
  BsDiamond as OuterIcon,
  BsDiamondFill as Icon
} from 'react-icons/bs';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: inline-block;
  font-size: ${p => p.size || '1em'};
  height: ${p => p.size || '1em'};
  width: ${p => p.size || '1em'};
  & > div {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    position: relative;
    width: 100%;
  
    & > *:first-child {
      color: ${p => p.color || 'inherit'};
      position: absolute;
      font-size: 50%;
    }
    & > *:last-child {
      position: absolute;
      color: ${p => p.selectedColor || p.theme.colors.main};
      display: ${p => p.selected ? 'block' : 'none'};
    }
  }
`;

const NavIcon = ({ size, ...props }) => {
  const standardSize = Number.isInteger(size) ? `${size}px` : (size || '1em');
  return (
    <Wrapper {...props} size={standardSize}>
      <div>
        <Icon />
        <OuterIcon />
      </div>
    </Wrapper>
  );
}

export default NavIcon;