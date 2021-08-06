import styled from 'styled-components';

const StyledDataReadout = styled.div`
  align-items: center;
  display: flex;
  font-size: ${props => props.theme.fontSizes.mainText};
  padding: 5px 0;
`;

const Label = styled.label`
  color: ${props => props.theme.colors.secondaryText};
  display: flex;
  flex: 0 1 auto;
  padding-right: 10px;
  white-space: nowrap;

  &:after {
    content: ':';
  }
`;

const Data = styled.span`
  color: ${props => props.theme.colors.mainText};
  flex: 0 1 auto;
  overflow: hidden;
  position: relative;
  text-overflow: ellipsis;
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
