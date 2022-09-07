import { useCallback, useEffect } from 'react';

import useStore from '~/hooks/useStore';
import draggableComponents from '~/game/interface/draggable';

const Draggables = () => {
  const draggables = useStore(s => s.draggables);

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
