import styled from 'styled-components';

import Badge from '~/components/Badge';

const StyledMenu = styled.div`
  cursor: ${p => p.theme.cursors.active};
  margin-right: 10px;
  width: 120px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin: 0;
    max-height: none;
    width: 100%;
  }
`;

const StyledBadge = styled(Badge)`
  font-size: 85%;
  position: absolute;
  right: 8px;
  top: 6px;
`;

const MenuHeader = styled.div`
  color: rgb(255, 255, 255, 0.6);
  font-size: ${p => p.theme.fontSizes.mainText};
  height: 44px;
  letter-spacing: 2px;
  line-height: 44px;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 3px black;
  transition: color 0.4s ease;
  z-index: 5;

  &:before {
    content: '';
    border-bottom: 3px solid ${p => p.theme.colors.main};
    position: absolute;
    width: 50px;
    bottom: -5px;
    left: 50%;
    margin-left: -25px;
    transition-property: left, margin-left, width;
    transition-duration: 0.4s;
    pointer-events: none;
  }

  ${StyledMenu}:hover & {
    color: ${p => p.theme.colors.main};
    &:before { 
      left: 0%;
      margin-left: 0;
      width: 100%;
    }

    & ${StyledBadge} {
      opacity: 0;
    }
  }
`;

const MenuItems = styled.div`
  background-color: rgb(0, 0, 0, 0.25);
  backdrop-filter: blur(5px);

  max-height: 0;
  overflow: hidden;
  transition: max-height 0.6s ease;

  ${StyledMenu}:hover & {
    max-height: 250px;
  }
`;

const Menu = (props) => (
  <StyledMenu>
    <MenuHeader>
      <span>{props.title}</span>
      <StyledBadge max={99} value={props.badge} />
    </MenuHeader>
    <MenuItems>
      {props.children}
    </MenuItems>
  </StyledMenu>
);

export default Menu;
