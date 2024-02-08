import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

import { CloseIcon, CollapsedIcon } from '~/components/Icons';
import ClipCorner from './ClipCorner';
import theme from '~/theme';
import IconButton from './IconButton';

const toggleWidth = 32;
const titleHeight = 48;
const marginBottom = 12;
const cornerSize = 12;

const bgPadding = 4;

const Wrapper = styled.div`
  ${p => p.theme.clipCorner(cornerSize)};
  border: 1px solid ${p => p.theme.colors.main};
  overflow: hidden;
  padding: 0 10px;
  position: relative;
  &:before {
    ${p => p.theme.clipCorner(cornerSize - 3)};
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.1);
    pointer-events: none;
    position: absolute;
    bottom: ${bgPadding}px;
    left: ${bgPadding}px;
    right: ${bgPadding}px;
    top: ${bgPadding}px;
    transition: background 250ms ease;
    z-index: -2;
  }
  ${p => p.collapsed && `
    &:hover:before {
      background: ${p.headerColor || `rgba(${p.theme.colors.mainRGB}, 0.3)`};
    }
  `};
`;

const Background = styled.div``;


const Uncollapsible = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  pointer-events: all;
  ${p => p.headerColor && `
    &:before {
      ${p.collapsed && p.theme.clipCorner(cornerSize - 3)};
      content: "";
      height: 41px;
      pointer-events: none;
      position: absolute;
      left: ${bgPadding}px;
      right: ${bgPadding}px;
      top: ${bgPadding}px;
      transition: background 250ms ease;
      z-index: -1;
    }

    ${p.forceHeaderColor && `&:before { background-color: ${p.headerColor}; }`};
  `}
`;

const Toggle = styled.div`
  align-items: center;
  display: flex;
  font-size: 28px;
  justify-content: center;
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
  font-size: 15px;
  font-weight: bold;
  height: ${titleHeight}px;
  transition: border-color 250ms ease;
  & > svg {
    font-size: 24px;
    margin-right: 3px;
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
  margin-bottom: ${marginBottom}px;
  overflow: hidden;
  transition: max-height 250ms ease, border-color 250ms ease, margin-bottom 250ms ease;
  ${p => p.width && `width: ${p.width};`}
  ${p => p.collapsed && `
    max-height: 0;
    margin-bottom: 0;
  `};
  ${p => !p.collapsed && css`
    animation: ${expandedAnim} 500ms;
    max-height: 2000px;
  `};
`;

const TitleAction = styled.div`
  font-size: 90%;
  font-weight: bold;
  margin-right: 3px;
  text-transform: uppercase;
  filter: brightness(2) saturate(2);
`;

const CollapsibleBlock = ({
  children,
  initiallyClosed,
  onClose,
  openOnChange,
  outerStyle = {},
  title,
  containerHeight,
  titleAction,
  ...props
}) => {
  const [collapsed, setCollapsed] = useState(!!initiallyClosed);
  const toggleCollapse = useCallback(() => {
    if (onClose) return;
    setCollapsed((c) => !c);
  }, [onClose]);

  const hasLoaded = useRef();

  useEffect(() => {
    if (hasLoaded.current) {
      setCollapsed(false);
    } else {
      hasLoaded.current = true;
    }
  }, [openOnChange, toggleCollapse]);

  return (
    <Wrapper
      collapsed={collapsed}
      headerColor={props.uncollapsibleProps?.headerColor}
      style={outerStyle}>
      <Uncollapsible
        collapsed={collapsed}
        forceHeaderColor={!!onClose}
        onClick={toggleCollapse}
        {...props.uncollapsibleProps}>
        <Background collapsed={collapsed} {...props.uncollapsibleProps} />
        <Title>{title}</Title>
        {titleAction && <TitleAction>{titleAction(!collapsed)}</TitleAction>}
        <Toggle collapsed={collapsed}>
          {onClose
            ? <IconButton
              backgroundColor={`rgba(0, 0, 0, 0.15)`}
              onClick={onClose}
              style={{
                marginRight: 0,
                padding: '0.1em',
                height: '1.5em',
                width: '1.5em'
              }}><CloseIcon /></IconButton>
            : <CollapsedIcon />
          }
        </Toggle>
      </Uncollapsible>
      <Collapsible
        collapsed={collapsed}
        containerHeight={containerHeight}
        {...props.collapsibleProps}>
        {children}
      </Collapsible>
      <ClipCorner color={theme.colors.main} dimension={cornerSize} />
    </Wrapper>
  );
};

export default CollapsibleBlock;