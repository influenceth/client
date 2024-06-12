import { Tooltip } from 'react-tooltip';
import styled from 'styled-components';

import Button, { bgOpacity, bgOpacityHover } from '~/components/ButtonAlt';
import { reactBool } from '~/lib/utils';
import { hexToRGB } from '~/theme';

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
    border-color: ${p.theme.colors.main} !important;
    color: ${p.isSelected ? `black` : p.theme.colors.main};
    & > div {
      background-color: ${p.isSelected ? p.theme.colors.main : `rgba(${hexToRGB(p.theme.colors.main)}, ${bgOpacity * (p.bgStrength || 1)})`} !important;
    }
    &:hover {
      border-color: ${p.theme.colors.main};
      color: ${p.isSelected ? 'black' : 'white'};
      & > div {
        background-color: ${p.isSelected ? p.theme.colors.main : `rgba(${hexToRGB(p.theme.colors.main)}, ${bgOpacityHover * (p.bgStrength || 1)})`} !important;
      };
      & > svg {
        stroke: ${p.theme.colors.main};
      };
    };
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

const Switcher = ({ buttons, buttonWidth, onChange, size, tooltipContainer = 'global', value }) => (
  <Wrapper>
    {buttons.map(({ icon, label, tooltip, value: buttonValue }, i) => {
      const styles = {};
      if (i !== buttons.length - 1) styles.borderRight = 0;
      if (i !== 0) styles.borderLeft = 0;
      const tooltipProps = tooltip && buttonValue !== value
        ? {
          'data-tooltip-id': tooltipContainer,
          'data-tooltip-content': tooltip
        }
        : {};
      return (
        <SwitcherButton
          key={buttonValue}
          flip={reactBool(i === 0)}
          isSelected={buttonValue === value}
          onClick={() => onChange(buttonValue)}
          size={size || undefined}
          style={{ ...styles }}
          {...tooltipProps}
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
