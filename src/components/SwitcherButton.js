import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import { reactBool } from '~/lib/utils';
import theme, { hexToRGB, getContrastText } from '~/theme';

const bgOpacity = 0.2;
const hoverBgOpacity = 0.2;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
`;
const SwitcherButton = styled(Button)`
  font-weight: bold;
  ${p => p.width && `
    max-width: ${p.width};
    width: ${p.width};
  `}

  ${p => p.disabled
    ? `
      color: rgba(255, 255, 255, 0.5);
      cursor: ${p.theme.cursors.default};
      border-color: ${p.borderless ? 'transparent' : p.theme.colors.disabledText};
      & > div {
        background-color: ${p.disabledColor || (p.background === 'transparent' ? 'transparent' : `rgba(${hexToRGB(p.theme.colors.disabledButton)}, ${bgOpacity * (p.bgStrength || 1)})`)};
      }
      & > svg {
        stroke: ${p.theme.colors.disabledText};
      }
    `
    : `
      color: ${p.color || (
        p.subtle
          ? (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)
          : (
            p.background && p.background !== 'transparent'
              ? getContrastText(p.background) 
              : p.theme.colors.main 
          )
      )};
      & > div {
        background-color: ${p.background || `rgba(${hexToRGB(p.isTransaction ? p.theme.colors.txButton : p.theme.colors.mainButton)}, ${bgOpacity * (p.bgStrength || 1)})`};
      }
      &:active > div {
        background-color: ${p.isTransaction ? p.theme.colors.txButton : p.theme.colors.mainButton};
      }
      &:hover > div {
        color: ${p.background == theme.colors.main ? getContrastText(p.background) : `white`};
        background-color: ${p.background == theme.colors.main // Background colors of the switcher button IF Active. Note: there's probably a better way to check if it's active
          ? `rgb(${hexToRGB(p.theme.colors.main)})`
          : `rgba(${hexToRGB(p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)}, ${hoverBgOpacity * (p.bgStrength || 1)})`
      }
    `
  }
`;
const SwitcherButtonInner = styled.div`
  align-items: center;
  display: flex;
  & > svg {
    font-size: 75%;
    margin-right: 12px;
  }
`;

const Switcher = ({ buttons, buttonWidth, onChange, size, value }) => (
  <Wrapper>
    {buttons.map(({ icon, label, value: buttonValue }, i) => {
      const styles = {};
      if (i !== buttons.length - 1) styles.borderRight = 0;
      if (i !== 0) styles.borderLeft = 0;
      return (
        <SwitcherButton
          key={buttonValue}
          background={buttonValue === value ? theme.colors.main : `rgba(${hexToRGB(theme.colors.main)}, 0.15)`} //Background color
          width={buttonWidth}
          flip={reactBool(i === 0)}
          onClick={() => onChange(buttonValue)}
          size={size || undefined}
          style={{
            ...styles,
            color: buttonValue === value ? undefined : `${theme.colors.main}` //Text color
          }}>
          <SwitcherButtonInner>
            {icon || null} {label}
          </SwitcherButtonInner>
        </SwitcherButton>
      );
    })}
  </Wrapper>
);

export default Switcher;

/*
Dark red
color: rgb(255, 40, 40);

background-color: rgba(${hexToRGB(p.isTransaction ? p.theme.colors.txButton : p.theme.colors.mainButton)}, ${hoverBgOpacity * (p.bgStrength || 1)});
background-color: rgba(${hexToRGB(
  p.subtle
    ? (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.mainButton)
    : ('white')
  )}, ${hoverBgOpacity * (p.bgStrength || 1)});


background-color: '${p.color || (
          p.subtle
            ? (p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)
            : (
              p.background && p.background !== 'transparent'
                ? 'getContrastText(p.background)'
                : 'white'
            )
        )};'


  */