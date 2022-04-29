import { useCallback, useEffect } from 'react';

import useStore from '~/hooks/useStore';
import draggableComponents from '~/game/interface/draggable';

const Draggables = () => {
  const draggables = useStore(s => s.draggables);
  const dispatchDraggableOpen = useStore(s => s.dispatchDraggableOpen);

  // TODO: remove this... just for debugging vvv
  const openDraggableOnKeydown = useCallback((e) => {
    if (e.shiftKey && e.which === 32) {
      dispatchDraggableOpen('ModelViewer', {});
    }
  }, [dispatchDraggableOpen]);

  useEffect(() => {
    document.addEventListener('keydown', openDraggableOnKeydown);
    return () => {
      document.removeEventListener('keydown', openDraggableOnKeydown);
    }
  }, []);
  // ^^^

  return Object.keys(draggables).map((id) => {
    const { type, params } = draggables[id];
    const DraggableComponent = draggableComponents[type];
    if (DraggableComponent) {
      return (
        <DraggableComponent key={id} draggableId={id} {...params} />
      );
    }
    return null;
  });
};

export default Draggables;
