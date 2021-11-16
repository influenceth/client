import React from 'react';
import {
  BsDiamond as OuterIcon,
  BsDiamondFill as Icon
} from 'react-icons/bs';
import styled from 'styled-components';

const Container = styled.div`
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
    color: ${p => p.theme.colors.main};
    display: ${p => p.selected ? 'block' : 'none'};
  }
`;

const NavIcon = (props) => (
  <Container {...props}>
    <Icon />
    <OuterIcon />
  </Container>
);

export default NavIcon;