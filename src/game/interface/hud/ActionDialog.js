import { useEffect, useMemo } from 'react';
import { PuffLoader } from 'react-spinners';

import Dialog from '~/components/Dialog';
import useAsteroid from '~/hooks/useAsteroid';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import Construct from './actionDialogs/Construct';
import Extract from './actionDialogs/Extract';
import NewCoreSample from './actionDialogs/NewCoreSample';
import Deconstruct from './actionDialogs/Deconstruct';
import ImproveCoreSample from './actionDialogs/ImproveCoreSample';
import PlanBuilding from './actionDialogs/PlanBuilding';
import SurfaceTransfer from './actionDialogs/SurfaceTransfer';
import UnplanBuilding from './actionDialogs/UnplanBuilding';
import ReactTooltip from 'react-tooltip';

export const useAsteroidAndLot = (props = {}) => {
  const selectedLot = useStore(s => s.asteroids.lot);
  const { asteroidId: defaultAsteroidId, lotId: defaultLotId } = selectedLot || {};
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(props.asteroidId || defaultAsteroidId);
  const { data: lot, isLoading: lotIsLoading } = useLot(
    props.asteroidId || defaultAsteroidId,
    props.lotId || defaultLotId // (should prop only use lot default if using asteroid default)
  );

  // close dialog if cannot load asteroid and lot
  useEffect(() => {
    if (!asteroid || !lot) {
      if (!asteroidIsLoading && !lotIsLoading) {
        props.onClose();
      }
    }
  }, [asteroid, lot, asteroidIsLoading, lotIsLoading]);

  return {
    asteroid,
    lot,
    isLoading: asteroidIsLoading || lotIsLoading
  }
};

const ActionDialogWrapper = () => {
  const actionDialog = useStore(s => s.actionDialog);
  return actionDialog?.type ? <ActionDialog {...actionDialog} /> : null;
};

const ActionDialog = ({ type, params }) => {
  const setAction = useStore(s => s.dispatchActionDialog);
  const { isLoading, ...locParams } = useAsteroidAndLot(params);

  const allProps = useMemo(() => ({
    ...params,
    ...locParams, 
    onSetAction: setAction,
    onClose: () => setAction(),
  }), [params, locParams, setAction]);

  useEffect(() => {
    const onKeyUp = (e) => {
      if (e.key === 'Escape' || e.which === 32) {
        setAction();
      }
    };
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keyup', onKeyUp);
    }
  }, []);

  return (
    <Dialog backdrop="rgba(30, 30, 35, 0.5)" opaque>
      {isLoading && (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PuffLoader color="white" />
        </div>
      )}
      {!isLoading && (
        <div style={{ position: 'relative' }}>
          {type === 'PLAN_BUILDING' && <PlanBuilding {...allProps} />}
          {type === 'UNPLAN_BUILDING' && <UnplanBuilding {...allProps} />}
          {type === 'CONSTRUCT' && <Construct {...allProps} />}
          {type === 'DECONSTRUCT' && <Deconstruct {...allProps} />}
          {type === 'EXTRACT_RESOURCE' && <Extract {...allProps} />}
          {type === 'IMPROVE_CORE_SAMPLE' && <ImproveCoreSample {...allProps} />}
          {type === 'NEW_CORE_SAMPLE' && <NewCoreSample {...allProps} />}
          {type === 'SURFACE_TRANSFER' && <SurfaceTransfer {...allProps} />}
        </div>
      )}
      <ReactTooltip id="actionDialog" place="left" effect="solid" />
    </Dialog>
  );
}

export default ActionDialogWrapper;
