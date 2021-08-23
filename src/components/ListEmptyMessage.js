import styled from 'styled-components';

const StyledListEmptyMessage = styled.li`
  align-items: center;
  display: flex;
  min-height: 40px;
  padding-top: 15px;
`;

const ListEmptyMessage = (props) => {
  const { children, ...restProps } = props;

  return (
    <StyledListEmptyMessage {...restProps}>
      {children}
    </StyledListEmptyMessage>
  )
};

export default ListEmptyMessage;
