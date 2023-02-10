import React, { useCallback, useEffect, useMemo, useState } from 'react';

const ProjectionLayerContext = React.createContext();

export function ProjectionLayerProvider({ children }) {
  const [projection, setProjection] = useState();
  const contextValue = useMemo(() => ({
    projection,
    setProjection
  }), [projection]);
  return (
    <ProjectionLayerContext.Provider value={contextValue}>
      {children}
    </ProjectionLayerContext.Provider>
  );
}

export default ProjectionLayerContext;