import styled from 'styled-components';

const StyledTime = styled.div`
  color: white;
  font-size: 20px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 0 3px black;

  &:after {
    content: 'DAYS';
    color: rgba(255, 255, 255, 0.6);
    font-size: 60%;
    letter-spacing: 1px;
    margin-left: 4px;
  }
`;

const Time = (props) => {
  const { displayTime, ...restProps } = props;

  return (
    <StyledTime {...restProps}>{displayTime}</StyledTime>
  );
};

export default Time;
