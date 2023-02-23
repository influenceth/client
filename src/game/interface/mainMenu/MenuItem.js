import styled from 'styled-components';

const StyledMenuItem = styled.div`
  align-items: center;
  color: white;
  display: flex;
  font-size: ${p => p.theme.fontSizes.mainText};
  height: 44px;
  justify-content: left;
  letter-spacing: 1px;
  transition: all 0.3s ease 25ms;

  & span {
    flex: 0 1 auto;
  }

  & > svg {
    flex: 0 0 auto;
    font-size: 20px;
    margin: 0 8px 0 4px;
    opacity: 0.4;
  }

  &:hover {
    color: white;
    background-color: ${p => p.theme.colors.main};
    & > svg {
      opacity: 0.75;
    }
  }

  border-bottom: 1px solid #333;
  &:last-child {
    border-bottom: 0;
  }
  &:first-child {
    height: 47px;
    padding-top: 3px;
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
