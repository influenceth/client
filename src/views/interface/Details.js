import styled from 'styled-components';

const StyledDetails = styled.div`
  border-right: 2px solid ${props => props.theme.colors.mainBorder};
  bottom: 0;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 50px),
    calc(100% - 2px) calc(100% - 50px),
    calc(100% - 25px) calc(100% - 25px),
    0 calc(100% - 25px)
  );
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
`;

const Details = () => {
  return (
    <StyledDetails />
  );
};

export default Details;
