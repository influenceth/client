import styled from 'styled-components';

const UncontrolledTextArea = styled.textarea`
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.8);
  color: ${p => p.theme.colors.mainText};
  font-family: inherit;
  font-size: ${p => p.theme.colors.detailText};
  height: 100%;
  outline: none;
  padding: 10px 5px;
  resize: none;
  transition: background-color 250ms ease, border-color 250ms ease;
  width: ${p => p.width ? `${p.width}px` : '100%'};
  &::placeholder {
    opacity: 0.3;
    transition: opacity 250ms ease;
  }
  &:focus {
    background-color: ${p => p.theme.colors.inputBackground};
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

export const TextAreaWrapper = styled.div`
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

export default UncontrolledTextArea;