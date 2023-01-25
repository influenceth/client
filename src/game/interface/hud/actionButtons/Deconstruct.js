import { useCallback, useMemo } from 'react';

import { DeconstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  OPERATIONAL: 'Deconstruct Building',
  DECONSTRUCTING: 'Deconstructing...'
};

const Deconstruct = ({ asteroid, plot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('DECONSTRUCT');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (Object.values(plot?.building?.inventories || {}).find((i) => i.mass > 0 || i.reservedMass > 0)) {
      return 'Not Empty';
    }
    if (plot?.building?.extraction?.status > 0) {
      return 'Busy';
    }
    return null;
  }, [plot?.building]);

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