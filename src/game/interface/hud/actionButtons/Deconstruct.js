import { useCallback, useMemo } from '~/lib/react-debug';
import { Inventory } from '@influenceth/sdk';

import { DeconstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const labelDict = {
  OPERATIONAL: 'Deconstruct Building',
  DECONSTRUCTING: 'Deconstructing...'
};

const isVisible = ({ constructionStatus, building, crew, ship }) => {
  return crew && building && !ship
    && building.Control?.controller?.id === crew.id
    && ['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus);
};

const Deconstruct = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);

  const handleClick = useCallback(import.meta.url, () => {
    onSetAction('DECONSTRUCT');
  }, [onSetAction]);

  const disabledReason = useMemo(import.meta.url, () => {
    if (_disabled) return 'loading...';

    if (
      (lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.mass > 0)
      || lot?.building?.Dock?.dockedShips > 0
      || lot?.building?.Station?.population > 0
    ) return 'not empty';

    if (
      (lot?.building?.Extractors || []).find((e) => e.status > 0)
      || (lot?.building?.Processors || []).find((e) => e.status > 0)
      || (lot?.building?.DryDocks || []).find((e) => e.status > 0)
    ) return 'in operation';

    if ((lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.reservedMass > 0)) {
      return 'pending deliveries';
    }

    if (constructionStatus === 'OPERATIONAL') {
      return getCrewDisabledReason({ asteroid, crew });
    }

    return null;
  }, [asteroid, crew, lot?.building]);

  return (
    <ActionButton
      label={`${labelDict[constructionStatus]}`}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        loading: constructionStatus === 'DECONSTRUCTING'
      }}
      icon={<DeconstructIcon />}
      onClick={handleClick} />
  );
};

export default { Component: Deconstruct, isVisible };