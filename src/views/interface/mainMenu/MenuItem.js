import styled from 'styled-components';

const StyledMenuItem = styled.div`
  align-items: center;
  color: rgba(255, 255, 255, 0.75);
  display: flex;
  font-size: ${props => props.theme.fontSizes.mainText};
  height: 44px;
  justify-content: left;
  letter-spacing: 1px;
  text-align: center;
  text-transform: uppercase;
  transition: all 0.3s ease 25ms;

  &:hover {
    color: white;
    background-color: ${props => props.theme.colors.main};
  }

  & span {
    flex: 0 1 auto;
  }

  & svg {
    flex: 0 1 auto;
    height: 15px;
    margin: 0 7px;
    width: 15px;
  }
`;

const MenuItem = (props) => {
  return (
    <StyledMenuItem {...props}>
      {props.icon}
      <span>{props.name}</span>
    </StyledMenuItem>
  );
}

export default MenuItem;
