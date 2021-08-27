import styled from 'styled-components';

const StyledText = styled.span`
  flex: 1 1 0;
  color: ${p => p.theme.colors.mainText};
  font-size: ${p => p.theme.fontSizes.mainText};
  line-height: 18px;
  margin: 5px 0;
  width: 100%;
`;

const Text = (props) => {
  const { children, ...restProps } = props;
  return (
    <StyledText {...restProps}>{children}</StyledText>
  );
};

export default Text;
