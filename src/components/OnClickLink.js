import styled from 'styled-components';

const OnClickLink = styled.span`
  color: ${p => p.theme?.colors?.mainText || '#ccc'};
  cursor: ${p => p.theme?.cursors?.active || 'pointer'};
  text-decoration: ${p => p.noUnderline || p.reverseUnderline ? 'none' : 'underline'};
  &:active,
  &:hover {
    color: white;
    text-decoration: ${p => p.reverseUnderline ? 'underline' : 'none'};
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