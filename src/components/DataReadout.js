import styled from 'styled-components';

const StyledDataReadout = styled.div`
  display: flex;
  padding-bottom: 10px;
  font-size: ${props => props.theme.fontSizes.mainText};
`;

const Label = styled.label`
  color: ${props => props.theme.colors.secondaryText};
  flex: 0 1 auto;
  padding-right: 10px;

  &:after {
    content: ':';
  }
`;

const Data = styled.span`
  color: ${props => props.theme.colors.mainText};
  flex: 0 1 auto;
`;

const DataReadout = (props) => {
  return (
    <StyledDataReadout {...props}>
      <Label>{props.label || ''}</Label>
      <Data>{props.data || ''}</Data>
    </StyledDataReadout>
  );
};

export default DataReadout;
