import styled from 'styled-components';

const OnClickLink = styled.span`
  color: ${p => p.theme.colors.mainText};
  cursor: ${p => p.theme.cursors.active};
  text-decoration: ${p => p.noUnderline ? 'none' : 'underline'};
  &:active,
  &:hover {
    color: white;
    text-decoration: none;
  }

  ${p => p.maxWidth && `
    display: inline-block;
    text-overflow: ellipsis;
    max-width: ${p.maxWidth};
    overflow: hidden;
    vertical-align: top;
    white-space: nowrap;
  `}
`;

export default OnClickLink;