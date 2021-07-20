import styled from 'styled-components';

const Wrapper = styled.div`
  background-color: rgba(132, 164, 220, 0.5);
  border-left: 5px solid rgb(132, 164, 220);
  clip-path:
    polygon(
      0% 0%,
      100% 0%,
      100% calc(100% - 20px),
      calc(100% - 20px) 100%,
      0% 100%
    );
  font-size: 14px;
  padding: 15px;
`;

const Title = styled.h2`
  font-size: 18px;
  margin: 0;
  padding: 0 0 10px 0;
`;

const Pane = (props) => {
  return (
    <Wrapper>
      {props.title && (
        <Title>{props.title}</Title>)
      }
      {props.children}
    </Wrapper>
  );
};

export default Pane;
