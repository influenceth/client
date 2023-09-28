import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

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

const Collapsible = styled.div`
  border-bottom: 1px solid transparent;
  max-height: ${p => p.containerHeight + titleHeight + marginBottom}px;
  overflow: hidden auto;
  margin-left: ${toggleWidth}px;
  margin-bottom: ${marginBottom}px;
  transition: max-height 250ms ease, border-color 250ms ease, margin-bottom 250ms ease;
  ${p => p.width && `width: ${p.width};`}
  ${p => p.collapsed && `
    border-color: ${p.borderless ? 'transparent' : (p.borderColor || '#444')};
    max-height: 0;
    overflow: hidden;
    margin-bottom: 4px;
  `};
`;

const TitleAction = styled.div``;

const CollapsibleSection = ({ borderless, children, initiallyClosed, openOnChange, title, titleAction, ...props }) => {
  const [collapsed, setCollapsed] = useState(!!initiallyClosed);
  const [height, setHeight] = useState(0);
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const hasLoaded = useRef();
  const collapsible = useRef();

  useEffect(() => {
    if (hasLoaded.current) {
      setCollapsed(false);
    } else {
      hasLoaded.current = true;
    }
  }, [openOnChange, toggleCollapse]);

  // Get the height of the collapsible content
  useEffect(() => {
    if (collapsible.current) {
      const children = collapsible.current.children ? [...collapsible.current.children] : [];
      setHeight(children.reduce((acc, child) => acc + child.offsetHeight, 0));
    }
  }, [children, collapsible.current]);

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
        ref={collapsible}
        borderless={borderless}
        collapsed={collapsed}
        containerHeight={height}
        {...props.collapsibleProps}>
        {children}
      </Collapsible>
    </>
  );
};

export default CollapsibleSection;