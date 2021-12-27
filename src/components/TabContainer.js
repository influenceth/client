import { useCallback, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';

const TAB_HEIGHT = 40;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  ${p => p.negativeTopMargin ? `margin-top: -${TAB_HEIGHT}px;`: ''}
  overflow: hidden;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin-top: 0;
  }

  ${p => p.css || ''}
`;
const Tabs = styled.div`
  border-bottom: 1px solid rgba(200, 200, 200, 0.15);
  display: flex;
  flex-direction: row;
  height: ${TAB_HEIGHT}px;
`;
const Tab = styled.div`
  color: ${p => p.active ? p.theme.colors.main : 'white'};
  cursor: ${p => !p.disabled && p.theme.cursors.active};
  font-size: 15px;
  line-height: ${TAB_HEIGHT}px;
  opacity: ${p => {
    if (p.active) return 1;
    if (p.disabled) return 0.2;
    return 0.8;
  }};
  position: relative;
  text-align: center;
  text-transform: uppercase;
  width: 116px;

  & svg {
    vertical-align: text-bottom;
    margin-left: -24px;
    margin-right: 8px;
  }

  &:hover {
    ${p => (p.disabled || p.active) ? '' : 'opacity: 1;'}
  }
  
  &:after {
    content: '';
    height: 3px;
    background: currentColor;
    bottom: 0;
    left: 50%;
    margin-left: -16px;
    position: absolute;
    width: 32px;
  }
`;
const Pane = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
`;

const TabContainer = ({ tabs, panes, css, negativeTopMargin }) => {
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [active, setActive] = useState(0);

  const onClick = useCallback((i) => () => {
    if (tabs[i].disabled) {
      playSound('effects.failure');
    } else {
      playSound('effects.click');
      setActive(i);
    }
  }, [playSound, tabs]);

  return (
    <Container css={css} negativeTopMargin={negativeTopMargin}>
      <Tabs>
        {tabs.map((tab, i) => (
          <Tab
            key={i}
            active={i === active}
            disabled={tab.disabled}
            onClick={onClick(i)}>
            {tab.icon}
            {tab.label}
          </Tab>
        ))}
      </Tabs>
      <Pane>
        {panes[active]}
      </Pane>
    </Container>
  );
};

export default TabContainer;