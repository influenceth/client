import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import { boolAttr } from '~/lib/utils';
import theme from '~/theme';

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
`;
const SwitcherButton = styled(Button)`
  ${p => p.width && `
    max-width: ${p.width};
    width: ${p.width};
  `}
`;
const SwitcherButtonInner = styled.div`
  align-items: center;
  display: flex;
  & > svg {
    font-size: 85%;
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
          background={buttonValue === value ? theme.colors.main : '#444'}
          width={buttonWidth}
          flip={boolAttr(i === 0)}
          onClick={() => onChange(buttonValue)}
          size={size || undefined}
          style={{
            ...styles,
            color: buttonValue === value ? undefined : '#999'
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