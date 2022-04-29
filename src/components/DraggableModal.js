import { useCallback, useState } from 'react';
import styled from 'styled-components';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';

const Wrapper = styled.div`
  height: 400px;
  left: ${p => p.position?.x || 0}%;
  max-width: 100%;
  overflow: hidden;
  position: fixed;
  top: ${p => p.position?.y || 0}%;
  visibility: ${p => p.isDragging ? 'hidden' : 'visible'};
  width: 400px;
  z-index: ${p => (p.draggableIndex || 0) + 100};

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    /* TODO: */
  }
`;

const Container = styled.div`
  background-color: ${p => p.theme.colors.contentBackdrop};
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
  }
`;

const headerHeight = 40;
const Header = styled.h1`
  border-left: 3px solid ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  font-size: 20px;
  font-weight: 400;
  height: ${headerHeight}px;
  line-height: ${headerHeight}px;
  padding: 0 0 0 20px;
  position: relative;
  margin: 0;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-left: 20px;
  }
`;

const Content = styled.div`
  background: rgba(255,255,255,0.15);
  flex: 1 1 0;
  padding: 8px;
  min-width: 0;
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  z-index: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0;
  }
`;

const CloseButton = styled(IconButton)`
  position: absolute !important;
  top: 5px;
  right: -4px;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const undraggable = {
  draggable: true,
  onDragStart: (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
};

const DraggableModal = ({ draggableId, ...props }) => {
  const { index: draggableIndex, position } = useStore(s => s.draggables[draggableId]);
  const dispatchDraggableClose = useStore(s => s.dispatchDraggableClose);
  const dispatchDraggableToFront = useStore(s => s.dispatchDraggableToFront);
  const dispatchDraggableMoved = useStore(s => s.dispatchDraggableMoved);

  const [draggingFrom, setDraggingFrom] = useState();

  const handleDragStart = useCallback((e) => {
    setTimeout(() => {  // weirdness if alter target within dragstart event
      setDraggingFrom({
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY
      });
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e) => {
    // constrain to page, convert to % in case of screen resize
    dispatchDraggableMoved(draggableId, {
      x: 100 * Math.min(Math.max(0, e.nativeEvent.x - draggingFrom.x), window.innerWidth - e.target.clientWidth) / window.innerWidth,
      y: 100 * Math.min(Math.max(0, e.nativeEvent.y - draggingFrom.y), window.innerHeight - e.target.clientHeight) / window.innerHeight,
    });
    setDraggingFrom();
  }, [draggingFrom]);

  const handleMouseDown = useCallback((e) => {
    dispatchDraggableToFront(draggableId);
  }, [draggableId]);

  const { title, contentProps = {}, draggableData, ...restProps } = props;

  return (
    <Wrapper
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      isDragging={!!draggingFrom}
      position={position}
      draggableIndex={draggableIndex}
      {...restProps}>
      <Container {...restProps}>
        {title && <Header>{title}</Header>}
        <CloseButton onClick={() => dispatchDraggableClose(draggableId)} {...undraggable}>
          <CloseIcon />
        </CloseButton>
        <Content {...contentProps} {...undraggable}>
          {props.children}
        </Content>
      </Container>
    </Wrapper>
  );
};

export default DraggableModal;
