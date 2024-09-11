import { useCallback, useState } from '~/lib/react-debug';
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

const TabIcon = styled.div`
  font-size: 120%;
  padding-right: 8px;
  ${p => p.css || ''}
`;
const TabLabel = styled.div`
  position: relative;
  white-space: nowrap;
  ${p => p.css || ''}

  &:after {
    bottom: 0;
    border-bottom: 4px solid currentColor;
    content: "";
    left: 50%;
    margin-left: -16px;
    position: absolute;
    transition: borderBottomColor 250ms ease;
    width: 32px;
  }
`;

const Tab = styled.div`
  align-items: center;
  border-radius: 0.33em 0.33em 0 0;
  display: flex;
  margin-bottom: -1px;
  pointer-events: auto;
  transition: background 250ms ease, color 250ms ease, opacity 250ms ease;

  ${p => p.disabled
    ? `
      color: #555;
    `
    : `
      cursor: ${p.theme.cursors.active};
      ${p.active
        ? `
          color: white;
          background: rgba(${p.theme.colors.mainRGB}, 0.3);
          opacity: 1;
          & ${TabLabel} {
            &:after { border-bottom-color: ${p.theme.colors.brightMain}; }
          }
        `
        : `
          color: inherit;
          opacity: 0.5;
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

const Pane = styled.div`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;

  ${p => p.css || ''}
`;

const TabContainer = ({
  containerCss,
  containerHeight,
  controller,
  iconCss,
  initialActive,
  labelCss,
  negativeTopMargin,
  onChange,
  panes,
  paneCss,
  tabs,
  tabCss
}) => {
  const playSound = useStore(s => s.dispatchEffectStartRequested);

  const [_active, _setActive] = useState(initialActive || 0);

  // if want to control externally, pass in controller
  const active = controller?.active || _active;
  const setActive = controller?.setActive || _setActive;

  const onClick = useCallback(import.meta.url, (i) => () => {
    if (tabs[i].disabled) {
      playSound('failure');
    } else {
      playSound('click');
      setActive(i);
      if (onChange) onChange(i);
    }
  }, [playSound, tabs]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {tab.icon && <TabIcon css={iconCss || {}}>{tab.icon}</TabIcon>}
            <TabLabel css={labelCss || {}}>{tab.label}</TabLabel>
          </Tab>
        ))}
      </Tabs>
      {panes && (
        <Pane css={paneCss || {}}>
          {panes && panes[active]}
        </Pane>
      )}
    </Container>
  );
};

export default TabContainer;