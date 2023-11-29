import { useCallback, useMemo } from 'react';
import { Inventory } from '@influenceth/sdk';

import { DeconstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  OPERATIONAL: 'Deconstruct Building',
  DECONSTRUCTING: 'Deconstructing...'
};

const Deconstruct = ({ asteroid, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('DECONSTRUCT');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (
      (lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.mass > 0)
      || lot?.building?.Dock?.dockedShips > 0
      || lot?.building?.Station?.population > 0
    ) return 'not empty';
    
    if (
      (lot?.building?.Extractors || []).find((e) => e.status > 0)
      || (lot?.building?.Processors || []).find((e) => e.status > 0)
      || lot?.building?.DryDock?.status > 0
    ) return 'busy';

    if ((lot?.building?.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE && i.reservedMass > 0)) {
      return 'pending deliveries';
    }
    
    return null;
  }, [lot?.building]);

  return (
    <ActionButton
      label={`${labelDict[constructionStatus]}${disabledReason ? ` (${disabledReason})` : ''}` || undefined}
      flags={{
        disabled: _disabled || disabledReason || undefined,
        loading: constructionStatus === 'DECONSTRUCTING' || undefined
      }}
      icon={<DeconstructIcon />}
      onClick={handleClick} />
  );
};

export default Deconstruct;