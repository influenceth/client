import { useEffect, useMemo } from 'react';
import { PuffLoader } from 'react-spinners';

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
import { ActionDialogLoader } from './actionDialogs/components';

export const useAsteroidAndPlot = (props = {}) => {
  const selectedPlot = useStore(s => s.asteroids.plot);
  const { asteroidId: defaultAsteroidId, plotId: defaultPlotId } = selectedPlot || {};
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(props.asteroidId || defaultAsteroidId);
  const { data: plot, isLoading: plotIsLoading } = usePlot(
    props.asteroidId || defaultAsteroidId,
    props.plotId || defaultPlotId // (should prop only use plot default if using asteroid default)
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

const ActionDialogWrapper = () => {
  const actionDialog = useStore(s => s.actionDialog);
  return actionDialog?.type ? <ActionDialog {...actionDialog} /> : null;
};

const ActionDialog = ({ type, params }) => {
  const setAction = useStore(s => s.dispatchActionDialog);
  const { isLoading, ...locParams } = useAsteroidAndPlot(params);

  const allProps = useMemo(() => ({
    ...params,
    ...locParams, 
    onSetAction: setAction,
    onClose: () => setAction(),
  }), [params, locParams, setAction]);

  return (
    <Dialog backdrop="rgba(30, 30, 35, 0.5)" opaque>
      {isLoading && (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PuffLoader color="white" />
        </div>
      )}
      {!isLoading && (
        <div style={{ position: 'relative' }}>
          {type === 'BLUEPRINT' && <PlanConstruction {...allProps} />}
          {type === 'CANCEL_BLUEPRINT' && <UnplanConstruction {...allProps} />}
          {type === 'CONSTRUCT' && <Construction {...allProps} />}
          {type === 'DECONSTRUCT' && <Deconstruct {...allProps} />}
          {type === 'EXTRACT_RESOURCE' && <Extraction {...allProps} />}
          {type === 'IMPROVE_CORE_SAMPLE' && <ImproveCoreSample {...allProps} />}
          {type === 'NEW_CORE_SAMPLE' && <NewCoreSample {...allProps} />}
          {type === 'SURFACE_TRANSFER' && <SurfaceTransfer {...allProps} />}
        </div>
      )}
    </Dialog>
  );
}

export default ActionDialogWrapper;
