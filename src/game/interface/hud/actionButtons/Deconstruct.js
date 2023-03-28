import { useCallback, useMemo } from 'react';

import { DeconstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  OPERATIONAL: 'Deconstruct Building',
  DECONSTRUCTING: 'Deconstructing...'
};

const Deconstruct = ({ asteroid, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, lot?.i);
  const handleClick = useCallback(() => {
    onSetAction('DECONSTRUCT');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (Object.values(lot?.building?.inventories || {}).find((i) => i.mass > 0)) {
      return 'not empty';
    }
    else if (Object.values(lot?.building?.inventories || {}).find((i) => i.reservedMass > 0)) {
      return 'pending deliveries';
    }
    else if (lot?.building?.extraction?.status > 0) {
      return 'busy';
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