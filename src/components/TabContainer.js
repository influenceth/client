import { useCallback, useState } from 'react';
import styled from 'styled-components';

import useStore from '~/hooks/useStore';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  ${p => p.negativeTopMargin
    ? `
      height: calc(100% + ${p.tabHeight});
      margin-top: -${p.tabHeight};
    `
    : 'height: 100%;'}
  overflow: hidden;

  ${p => p.css || ''}

  & > div:first-child {
    height: ${p => p.tabHeight};
  }
`;
const Tabs = styled.div`
  border-bottom: 1px solid ${p => p.theme.colors.borderBottomAlt};
  display: flex;
  flex-direction: row;
  width: 100%;
`;
const Tab = styled.div`
  align-items: center;
  display: flex;
  margin-bottom: -1px;
  pointer-events: auto;
  transition: color 250ms ease;

  ${p => p.disabled
    ? `
      color: #555;
    `
    : `
      cursor: ${p.theme.cursors.active};
      ${p.active
        ? `
          color: ${p.theme.colors.main};
          opacity: 1;
        `
        : `
          color: inherit;
          opacity: 0.8;
          &:hover {
            color: white;
            opacity: 1;
          }
      `}
  `}
  & > * {
    line-height: ${p => p.tabHeight};
  }
  
  ${p => p.css || ''}
`;

const TabIcon = styled.div`
  font-size: 120%;
  padding-right: 8px;
  ${p => p.css || ''}
`;
const TabLabel = styled.div`
  position: relative;
  ${p => p.css || ''}
  
  &:after {
    bottom: 0;
    border-bottom: 4px solid currentColor;
    content: "";
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

const TabContainer = ({ 
  containerCss,
  containerHeight,
  iconCss,
  initialActive,
  labelCss,
  negativeTopMargin,
  onChange,
  panes,
  tabs,
  tabCss
}) => {
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [active, setActive] = useState(initialActive || 0);

  const onClick = useCallback((i) => () => {
    if (tabs[i].disabled) {
      playSound('effects.failure');
    } else {
      playSound('effects.click');
      setActive(i);
      if (onChange) onChange(i);
    }
  }, [playSound, tabs]);

  const tabHeight = containerHeight || '40px';
  return (
    <Container
      tabHeight={tabHeight}
      negativeTopMargin={negativeTopMargin}
      css={containerCss || {}}>
      <Tabs>
        {tabs.map((tab, i) => (
          <Tab
            key={i}
            active={i === active}
            disabled={tab.disabled}
            onClick={tab.onClick || onClick(i)}
            tabHeight={tabHeight}
            css={tabCss || {}}>
            <TabIcon css={iconCss || {}}>{tab.icon}</TabIcon>
            <TabLabel css={labelCss || {}}>{tab.label}</TabLabel>
          </Tab>
        ))}
      </Tabs>
      <Pane>
        {panes && panes[active]}
      </Pane>
    </Container>
  );
};

export default TabContainer;