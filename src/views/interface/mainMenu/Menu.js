import styled from 'styled-components';

const StyledMenu = styled.div`
  cursor: ${props => props.theme.cursors.active};
  margin-right: 10px;
  max-height: 44px;
  overflow: hidden;
  transition: all 0.6s ease;
  width: 130px;

  &:hover {
    max-height: 250px;
  }
`;

const MenuHeader = styled.div`
  border-bottom: 4px solid rgb(255, 255, 255, 0.25);
  color: rgb(255, 255, 255, 0.6);
  font-size: ${props => props.theme.fontSizes.mainText};
  font-weight: bold;
  height: 44px;
  letter-spacing: 2px;
  line-height: 53px;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 3px black;
  transition: all 0.4s ease;

  ${StyledMenu}:hover & {
    border-bottom: 4px solid ${props => props.theme.colors.main};
    color: ${props => props.theme.colors.main};
  }
`;

const MenuItems = styled.div`
  background-color: rgb(0, 0, 0, 0.25);
  backdrop-filter: blur(5px);
`;

const Menu = (props) => {
  return (
    <StyledMenu>
      <MenuHeader>
        <span>{props.title}</span>
      </MenuHeader>
      <MenuItems>
        {props.children}
      </MenuItems>
    </StyledMenu>
  );
};

export default Menu;
