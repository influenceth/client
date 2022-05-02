import { useCallback, useState } from 'react';
import styled from 'styled-components';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';

const Wrapper = styled.div`
  left: ${p => p.position?.x || 0}%;
  opacity: ${p => p.isDragging ? '0' : '1'};
  overflow: hidden;
  position: fixed;
  top: ${p => p.position?.y || 0}%;
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
  max-height: 80vh;
  max-width: 80vw;
  overflow: hidden;
  pointer-events: auto;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-color: ${p => p.theme.colors.mobileBackground};
    backdrop-filter: none;
    height: 100vh;
    max-height: none;
    max-width: none;
    width: 100vw;
  }
`;

const headerHeight = 40;
const Header = styled.div`
  align-items: center;
  border-left: 3px solid ${p => p.theme.colors.main};
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: ${headerHeight}px;
  padding: 0 0 0 20px;
  position: relative;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    border-left-width: 5px;
    padding-left: 20px;
  }
`;

const Title = styled.h1`
  flex: 1;
  font-size: 20px;
  font-weight: 400;
  line-height: ${headerHeight}px;
  margin: 0;
`;

const CloseButton = styled(IconButton)`
  border: 0;
  height: 24px;
  margin-right: 10px;
  padding: 2px;
  width: 24px;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    right: 0;
  }
`;

const Content = styled.div`
  background: rgba(255,255,255,0.15);
  max-height: calc(80vh - 40px);
  padding: 8px;
  min-width: 0; 
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
  z-index: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0;
    height: calc(100vh - 40px);
    max-height: none;
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
  }, [dispatchDraggableMoved, draggableId, draggingFrom]);

  const handleMouseDown = useCallback((e) => {
    dispatchDraggableToFront(draggableId);
  }, [dispatchDraggableToFront, draggableId]);

  const { title, contentProps = {}, draggableData, ...restProps } = props;

  // TODO: on some mobile devices, might be good to actually disable draggable / drag events,
  //  but doesn't actually seem possible to drag on mobile emulator at least
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
        <Header>
          {title && <Title>{title}</Title>}
          <CloseButton onClick={() => dispatchDraggableClose(draggableId)} {...undraggable}>
            <CloseIcon />
          </CloseButton>
        </Header>
        <Content {...contentProps} {...undraggable}>
          {props.children}
        </Content>
      </Container>
    </Wrapper>
  );
};

export default DraggableModal;
