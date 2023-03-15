import styled from 'styled-components';

const StyledTime = styled.div`
  color: white;
  font-size: 24px;
  height: 38px;
  line-height: 38px;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 3px black;

  &:after {
    content: 'DAYS';
    color: white;
    font-size: 60%;
    letter-spacing: 1px;
    margin-left: 4px;
    opacity: 0.6;
  }
`;

const Time = (props) => {
  const { displayTime, ...restProps } = props;

  return (
    <StyledTime {...restProps}>{displayTime}</StyledTime>
  );
};

export default Time;