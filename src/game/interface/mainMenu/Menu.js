import styled from 'styled-components';

import Badge from '~/components/Badge';

const StyledMenu = styled.div`
  cursor: ${p => p.theme.cursors.active};
  margin-right: 10px;
  max-height: 44px;
  overflow: hidden;
  transition: all 0.6s ease;
  width: 130px;

  &:hover {
    max-height: 250px;
  }

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
  border-bottom: 4px solid rgb(255, 255, 255, 0.25);
  color: rgb(255, 255, 255, 0.6);
  font-size: ${p => p.theme.fontSizes.mainText};
  font-weight: bold;
  height: 44px;
  letter-spacing: 2px;
  line-height: 53px;
  position: relative;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 3px black;
  transition: all 0.4s ease;

  ${StyledMenu}:hover & {
    border-bottom: 4px solid ${p => p.theme.colors.main};
    color: ${p => p.theme.colors.main};

    & ${StyledBadge} {
      opacity: 0;
    }
  }
`;

const MenuItems = styled.div`
  background-color: rgb(0, 0, 0, 0.25);
  backdrop-filter: blur(5px);
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
