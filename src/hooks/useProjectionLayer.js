import { useContext } from 'react';

import ProjectionLayerContext from '~/contexts/ProjectionLayerContext';

const useProjectionLayer = () => {
  return useContext(ProjectionLayerContext);
};

export default useProjectionLayer;
