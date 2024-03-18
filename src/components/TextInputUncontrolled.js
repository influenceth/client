import styled from 'styled-components';
import theme, { hexToRGB } from '~/theme';

const UncontrolledTextInput = styled.input`
  background-color: rgba(${p => hexToRGB(theme.colors.inputBackground)}, 0.5);
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.8);
  color: ${p => p.theme.colors.mainText};
  font-family: inherit;
  font-size: ${p => p.theme.fontSizes.detailText};
  height: 32px;
  outline: none;
  padding: 0 5px;
  transition: background-color 250ms ease, border-color 250ms ease;
  width: ${p => p.width ? `${p.width}px` : '100%'};
  &::placeholder {
    opacity: 0.4;
    transition: opacity 250ms ease;
  }
  &:focus {
    background-color: rgba(${p => hexToRGB(theme.colors.inputBackground)}, 1);
  }
  &:hover, &:focus {
    border-color: rgba(${p => p.theme.colors.mainRGB}, 1);
    &::placeholder {
      opacity: 0.8;
    }
  }

  &:disabled {
    background-color: rgba(${p => hexToRGB(theme.colors.disabledBackground)}, 0.2);
    border-color: transparent;
    cursor: ${p => p.theme.cursors.default};
  }
`;

export const UncontrolledTextInputLarge = styled(UncontrolledTextInput)`
  height: 40px;
  font-size: ${p => p.theme.fontSizes.featureText};
  font-family: 'Jetbrains Mono', sans-serif;
  font-weight: 100;
  &::placeholder {
    font-size: 90%;
    font-family: 'Jura', sans-serif;
  }
  &:hover, &:focus {
    &::placeholder {
      font-family: 'Jura', sans-serif;
    }
  }
`;

export const TextInputWrapper = styled.div`
  position: relative;
  align-items: center;
  display: flex;
  flex-direction: row;
  ${p => p.rightLabel && `
    &:after {
      content: "${p.rightLabel}";
      opacity: 0.33;
      position: absolute;
      right: 8px;
      white-space: nowrap;
    }
  `}
`;

export const safeValue = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  return '';
};

export default UncontrolledTextInput;