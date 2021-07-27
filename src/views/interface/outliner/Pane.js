import styled from 'styled-components';

import theme from '~/theme';

const StyledPane = styled.div`
  border-left: 4px solid ${props => props.theme.colors.main};
  font-size: 14px;
  padding: 15px 15px 15px 21px;
  margin: 10px 0;
`;

const Title = styled.h2`
  font-size: 18px;
  margin: 0;
  padding: 0 0 10px 0;
`;

const Pane = (props) => {
  return (
    <StyledPane>
      {props.title && (
        <Title>{props.title}</Title>)
      }
      {props.children}
    </StyledPane>
  );
};

export default Pane;
