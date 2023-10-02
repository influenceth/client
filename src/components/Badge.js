import styled from 'styled-components';

const height = 1.27;
const Badge = styled.span`
  align-items: center;
  background: rgba(${p => p.theme.colors.mainRGB}, ${p => p.subtler ? 0.9 : 1});
  border-radius: ${height / 2}em;
  color: white;
  display: inline-flex;
  justify-content: center;
  height: ${height}em;
  margin-left: 0.3em;
  min-width: ${height}em;
  padding: 0 3px;
  transition: opacity 0.4s ease 0.2s;
  ${p => !p.subtler && `font-weight: bold;`}

  &:before {
    content: "${p => p.max ? Math.min(p.max, p.value) : p.value}";
    font-size: 0.9em;
  }

  ${p => p.max && p.value > p.max && `
    &:after {
      content: "+";
      font-size: smaller;
      position: relative;
      top: -3px;
      vertical-align: super;
    }
  `}
`;

const FunctionalBadge = ({ max, showOnZero, value, ...otherProps }) => {
  if (showOnZero || value > 0) {
    return <Badge max={max} value={value} {...otherProps} />;
  }
  return null;
};

export default FunctionalBadge;