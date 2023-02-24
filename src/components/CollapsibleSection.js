import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { CollapsedIcon } from '~/components/Icons';

const toggleWidth = 32;

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
  height: 48px;
  transition: border-color 250ms ease;
  width: 100%;
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
  height: ${p => p.openHeight || '150px'};
  overflow: hidden;
  margin-left: ${toggleWidth}px;
  margin-bottom: 12px;
  transition: height 250ms ease, border-color 250ms ease, margin-bottom 250ms ease;
  ${p => p.width && `width: ${p.width};`}
  ${p => p.collapsed && `
    border-color: ${p.borderless ? 'transparent' : (p.borderColor || '#444')};
    height: 0;
    margin-bottom: 4px;
  `};
`;

const CollapsibleSection = ({ borderless, children, title, openHeight, ...props }) => {
  const [collapsed, setCollapsed] = useState();
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  return (
    <>
      <Uncollapsible collapsed={collapsed} onClick={toggleCollapse} {...props.uncollapsibleProps}>
        <Toggle collapsed={collapsed}>
          <CollapsedIcon />
        </Toggle>
        <Title>
          {title}
        </Title>
      </Uncollapsible>
      <Collapsible borderless={borderless} collapsed={collapsed} openHeight={openHeight} {...props.collapsibleProps}>
        {children}
      </Collapsible>
    </>
  );
};

export default CollapsibleSection;