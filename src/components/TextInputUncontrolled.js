import styled from 'styled-components';

const UncontrolledTextInput = styled.input`
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.8);
  color: ${p => p.theme.colors.mainText};
  font-family: inherit;
  font-size: ${p => p.theme.colors.detailText};
  height: 32px;
  outline: none;
  padding: 0 5px;
  transition: background-color 250ms ease, border-color 250ms ease;
  ${p => p.width ? `width: ${p.width}px` : ''};
  &::placeholder {
    opacity: 0.3;
    transition: opacity 250ms ease;
  }
  &:focus {
    background-color: rgba(255, 255, 255, 0.08);
  }
  &:hover, &:focus {
    border-color: rgba(${p => p.theme.colors.mainRGB}, 1);
    &::placeholder {
      opacity: 0.4;
    }
  }

  &:disabled {
    border-color: transparent;
    cursor: ${p => p.theme.cursors.default};
  }
`;

export const TextInputWrapper = styled.div`
  position: relative;
  ${p => p.rightLabel && `
    &:after {
      content: "${p.rightLabel}";
      opacity: 0.33;
      position: absolute;
      right: 8px;
      height: 32px;
      line-height: 32px;
    }
  `}
`;

export const safeValue = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  return '';
};

export default UncontrolledTextInput;