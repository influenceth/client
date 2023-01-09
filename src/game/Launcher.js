import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Switch, Route, Redirect, NavLink as Link } from 'react-router-dom';
import styled from 'styled-components';
import gsap from 'gsap';

import Button from '~/components/ButtonAlt';
import ButtonPill from '~/components/ButtonPill';
import OnClickLink from '../components/OnClickLink';
import useStore from '~/hooks/useStore';

import Settings from './launcher/Settings';

const StyledLauncher = styled.div`
  background-color: black;
  display: flex;
  height: 100%;
  justify-content: center;
  opacity: 1;
  padding: 125px 0;
  position: absolute;
  width: 100%;
  z-index: 9000;
`;

const MenuBar = styled.ul`
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  height: 125px;
  justify-content: center;
  left: 0;
  margin: 0;
  padding: 0;
  position: absolute;
  right: 0;
  top: 0;
`;

const MenuItem = styled.li`
  color: ${p => p.theme.colors.secondaryText};
  list-style-type: none;
  position: relative;
  width: 200px;

  &:hover, .current {
    color: ${p => p.theme.colors.mainText};
  }

  &:hover:after, .current:after {
    background-clip: padding-box;
    background-color: ${p => p.theme.colors.main};
    border: 2px solid rgba(${p => p.theme.colors.mainRGB}, 0.5);
    bottom: -5.5px;
    content: "";
    height: 6px;
    left: 50%;
    margin-left: -5.5px;
    position: absolute;
    transform: rotate(45deg);
    width: 6px;
  }

  .current:hover:after {
    display: none;
  }
`;

const StyledLink = styled(Link)`
  align-items: flex-end;
  color: inherit;
  display: flex;
  height: 100%;
  justify-content: center;
  padding-bottom: 12px;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  width: 100%;
`;

const MainContent = styled.div`
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  margin-top: 50px;
  overflow-y: scroll;
`;

const Footer = styled.div`
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  bottom: 0;
  display: flex;
  height: 125px;
  justify-content: center;
  left: 0;
  position: absolute;
  right: 0;
`;

const Diamond = styled.div`
  align-items: center;
  background-color: black;
  border: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  height: 25px;
  justify-content: center;
  position: absolute;
  transform: translateY(-50%) rotate(45deg);
  width: 25px;

  & div {
    background-color: ${p => p.theme.colors.main};
    height: 9px;
    width: 9px;
  }
`;

const InfoBar = styled.ul`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 0;

  & a {
    border-right: 1px solid ${p => p.theme.colors.mainBorder};
    color: ${p => p.theme.colors.secondaryText};
    font-size: 14px;
    padding: 5px 20px;
  }

  & a:last-child {
    border: 0;
  }
`;

const Launcher = (props) => {
  return (
    <StyledLauncher {...props}>
      <MenuBar>
        <MenuItem><StyledLink activeClassName="current" to="/account"><span>Account</span></StyledLink></MenuItem>
        <MenuItem><StyledLink activeClassName="current" to="/settings"><span>Settings</span></StyledLink></MenuItem>
        <MenuItem><StyledLink activeClassName="current" to="/store"><span>Store</span></StyledLink></MenuItem>
      </MenuBar>
      <MainContent>
        <Switch>
          <Route path="/settings">
            <Settings />
          </Route>
        </Switch>
      </MainContent>
      <Footer>
        <Diamond><div /></Diamond>
        <InfoBar>
          <a href="https://influenceth.io" target="_blank" rel="noopener noreferrer">About</a>
          <a href="https://discord.gg/influenceth" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://wiki.influenceth.io" target="_blank" rel="noopener noreferrer">Wiki</a>
        </InfoBar>
      </Footer>
    </StyledLauncher>
  );
};

export default Launcher;
