import styled from 'styled-components';

import Button, { hoverBgOpacity } from '~/components/ButtonAlt';
import { reactBool } from '~/lib/utils';
import theme, { hexToRGB, getContrastText } from '~/theme';

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

  ${p => !p.disabled && `
    &:hover > div {
      color: ${p.isSelected ? getContrastText(p.background) : `white`};
      background-color: rgba(
        ${hexToRGB(p.isTransaction ? p.theme.colors.txButton : p.theme.colors.main)},
        ${(p.isSelected ? 1 : hoverBgOpacity) * (p.bgStrength || 1)}
      );
    }
  `}
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
          background={buttonValue === value ? theme.colors.main : `rgba(${hexToRGB(theme.colors.main)}, 0.15)`}
          flip={reactBool(i === 0)}
          highContrast
          isSelected={buttonValue === value}
          onClick={() => onChange(buttonValue)}
          size={size || undefined}
          style={{
            ...styles,
            color: buttonValue === value ? undefined : `${theme.colors.main}` //Text color
          }}
          width={buttonWidth}>
          <SwitcherButtonInner>
            {icon || null} {label}
          </SwitcherButtonInner>
        </SwitcherButton>
      );
    })}
  </Wrapper>
);

export default Switcher;
