import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';

const Wrapper = styled.div.attrs(props => ({
  style: {
    left: `${props.position?.x > -1 ? props.position.x : 2}%`,
    top: `${props.position?.y > -1 ? props.position.y : 2}%`,
  },
}))`
  overflow: hidden;
  position: fixed;
  z-index: ${p => (p.draggableIndex || 0) + 100};

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    left: 0 !important;
    top: 0 !important;
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
  justify-content: space-between;
  padding: 0 0 0 20px;
  position: relative;
  z-index: 1;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    border-left-width: 5px;
    padding-left: 20px;
  }
`;

const Title = styled.h1`
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
  padding: 3px;
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
  onMouseDown: (e) => e.stopPropagation()
};

// TODO (enhancement): on resize, make sure dialogs still entirely on screen
const DraggableModal = ({ draggableId, ...props }) => {
  const { index: draggableIndex, position } = useStore(s => s.draggables[draggableId]);
  const dispatchDraggableClose = useStore(s => s.dispatchDraggableClose);
  const dispatchDraggableToFront = useStore(s => s.dispatchDraggableToFront);
  const dispatchDraggableMoved = useStore(s => s.dispatchDraggableMoved);

  const [draggingFrom, setDraggingFrom] = useState();
  const [tmpPosition, setTmpPosition] = useState(false);

  const draggable = useRef();

  const handleMouseDown = useCallback((e) => {
    dispatchDraggableToFront(draggableId);
    setDraggingFrom({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    });
  }, [dispatchDraggableToFront, draggableId]);

  const handleMouseUp = useCallback(() => {
    if (!!draggingFrom) {
      setDraggingFrom();
      if (tmpPosition) {
        dispatchDraggableMoved(draggableId, tmpPosition);
        setTmpPosition();
      }
    }
  }, [dispatchDraggableMoved, draggingFrom, draggableId, tmpPosition]);

  useEffect(() => {
    if (!!draggingFrom) {
      document.onmousemove = (e) => {
        setTmpPosition({
          x: 100 * Math.min(Math.max(0, e.x - draggingFrom.x), window.innerWidth - draggable.current.clientWidth) / window.innerWidth,
          y: 100 * Math.min(Math.max(0, e.y - draggingFrom.y), window.innerHeight - draggable.current.clientHeight) / window.innerHeight,
        });
      };
    } else {
      document.onmousemove = undefined;
    }
    return () => {
      document.onmousemove = undefined;
    };
  }, [draggingFrom]);

  // TODO (enhancement): on some mobile devices, might be good to actually disable draggable / drag events,
  //  but doesn't actually seem possible to drag on mobile emulator at least
  const { title, contentProps = {}, draggableData, ...restProps } = props;
  return (
    <Wrapper
      draggableIndex={draggableIndex}
      isDragging={!!draggingFrom}
      position={tmpPosition || position}
      ref={draggable}
      {...restProps}>
      <Container {...restProps}>
        <Header
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}>
          {title && <Title {...undraggable}>{title}</Title>}
          <CloseButton {...undraggable} onClick={() => dispatchDraggableClose(draggableId)}>
            <CloseIcon />
          </CloseButton>
        </Header>
        <Content {...contentProps}>
          {props.children}
        </Content>
      </Container>
    </Wrapper>
  );
};

export default DraggableModal;
