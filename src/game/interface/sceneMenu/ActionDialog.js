import { useEffect } from 'react';

import Dialog from '~/components/Dialog';
import useAsteroid from '~/hooks/useAsteroid';
import usePlot from '~/hooks/usePlot';
import useStore from '~/hooks/useStore';
import Construction from './actionDialogs/Construction';
import Extraction from './actionDialogs/Extraction';
import NewCoreSample from './actionDialogs/NewCoreSample';
import Deconstruct from './actionDialogs/Deconstruct';
import ImproveCoreSample from './actionDialogs/ImproveCoreSample';
import PlanConstruction from './actionDialogs/PlanConstruction';
import SurfaceTransfer from './actionDialogs/SurfaceTransfer';
import UnplanConstruction from './actionDialogs/UnplanConstruction';

export const useAsteroidAndPlot = (props) => {
  const selectedPlot = useStore(s => s.asteroids.plot);
  const { asteroidId: defaultAsteroidId, plotId: defaultPlotId } = selectedPlot || {};
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(props.asteroidId || defaultAsteroidId);
  const { data: plot, isLoading: plotIsLoading } = usePlot(
    props.asteroidId || defaultAsteroidId,
    props.plotId || defaultPlotId // (arguably should only use plot default if using asteroid default)
  );

  // close dialog if cannot load asteroid and plot
  useEffect(() => {
    if (!asteroid || !plot) {
      if (!asteroidIsLoading && !plotIsLoading) {
        props.onClose();
      }
    }
  }, [asteroid, plot, asteroidIsLoading, plotIsLoading]);

  return {
    asteroid,
    plot,
    isLoading: asteroidIsLoading || plotIsLoading
  }
};

const ActionDialog = ({ actionType, ...props }) => {
  return (
    <Dialog backdrop="rgba(30, 30, 35, 0.5)" opaque>
      <div style={{ position: 'relative' }}>
        {actionType === 'BLUEPRINT' && <PlanConstruction {...props} />}
        {actionType === 'CANCEL_BLUEPRINT' && <UnplanConstruction {...props} />}
        {actionType === 'CONSTRUCT' && <Construction {...props} />}
        {actionType === 'DECONSTRUCT' && <Deconstruct {...props} />}
        {actionType === 'EXTRACT_RESOURCE' && <Extraction {...props} />}
        {actionType === 'IMPROVE_CORE_SAMPLE' && <ImproveCoreSample {...props} />}
        {actionType === 'NEW_CORE_SAMPLE' && <NewCoreSample {...props} />}
        {actionType === 'SURFACE_TRANSFER' && <SurfaceTransfer {...props} />}
      </div>
    </Dialog>
  );
}

export default ActionDialog;