import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

import { CollapsedIcon } from '~/components/Icons';

const toggleWidth = 32;
const titleHeight = 48;
const marginBottom = 12;

const Uncollapsible = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  pointer-events: all;
`;

const Toggle = styled.div`
  align-items: center;
  display: flex;
  font-size: 28px;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 250ms ease;
  width: ${toggleWidth}px;

  & > svg {
    transform: rotate(${p => p.collapsed ? 0 : `90deg`});
    transition: transform 250ms ease;
  }

  ${Uncollapsible}:hover & {
    opacity: 1;
  }
`;

const Title = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex: 1;
  height: ${titleHeight}px;
  transition: border-color 250ms ease;
  & > svg {
    font-size: 28px;
    color: #646464;
  }
  & label {
    flex: 1;
    font-size: 18px;
    padding-left: 8px;
  }
`;

const expandedAnim = keyframes`
  from {
    overflow: hidden;
  }
`;

const Collapsible = styled.div`
  border-bottom: 1px solid transparent;
  ${p => p.containerHeight ?
    `max-height: ${p.containerHeight + titleHeight + marginBottom}px;` :
    `max-height: calc(100% - ${titleHeight + marginBottom}px)`
  };
  margin-left: ${toggleWidth}px;
  margin-bottom: ${marginBottom}px;
  overflow: hidden;
  transition: max-height 250ms ease, border-color 250ms ease, margin-bottom 250ms ease;
  ${p => p.width && `width: ${p.width};`}
  ${p => p.collapsed && `
    border-color: ${p.borderless ? 'transparent' : (p.borderColor || '#444')};
    max-height: 0;
    margin-bottom: 4px;
  `};
  ${p => !p.collapsed && css`
    animation: ${expandedAnim} 500ms;
    max-height: 2000px;
    min-height: 140px;
  `};
`;

const TitleAction = styled.div``;

const CollapsibleSection = ({
  borderless,
  children,
  forceClose,
  initiallyClosed,
  openOnChange,
  title,
  containerHeight,
  titleAction,
  ...props
}) => {
  const [collapsed, setCollapsed] = useState(!!initiallyClosed);
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const hasLoaded = useRef();

  useEffect(() => {
    if (forceClose) setCollapsed(true);
  }, [forceClose]);

  useEffect(() => {
    if (hasLoaded.current) {
      setCollapsed(false);
    } else {
      hasLoaded.current = true;
    }
  }, [openOnChange, toggleCollapse]);

  return (
    <>
      <Uncollapsible collapsed={collapsed} onClick={toggleCollapse} {...props.uncollapsibleProps}>
        <Toggle collapsed={collapsed}>
          <CollapsedIcon />
        </Toggle>
        <Title>
          {title}
        </Title>
        {titleAction && <TitleAction>{titleAction(!collapsed)}</TitleAction>}
      </Uncollapsible>
      <Collapsible
        borderless={borderless}
        collapsed={collapsed}
        containerHeight={containerHeight}
        {...props.collapsibleProps}>
        {children}
      </Collapsible>
    </>
  );
};

export default CollapsibleSection;