import { useCallback } from 'react';

import { UnplanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  PLANNED: 'Unplan Building Site',
  CANCELING: 'Unplanning...'
};

const UnplanBuilding = ({ asteroid, plot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('UNPLAN_BUILDING');
  }, [onSetAction]);

  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        disabled: _disabled || undefined,
        loading: constructionStatus === 'CANCELING' || undefined
      }}
      icon={<UnplanBuildingIcon />}
      onClick={handleClick} />
  );
};

export default UnplanBuilding;