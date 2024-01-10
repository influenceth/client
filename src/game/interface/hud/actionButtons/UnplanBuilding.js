import { useCallback, useMemo } from 'react';

import { UnplanBuildingIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const labelDict = {
  PLANNED: 'Unplan Building Site',
  CANCELING: 'Unplanning...'
};

const isVisible = ({ constructionStatus, crew, lot }) => {
  return crew && lot && lot.building
    && lot.building.Control?.controller?.id === crew.id
    && ['PLANNED', 'CANCELING'].includes(constructionStatus);
};

const UnplanBuilding = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('UNPLAN_BUILDING');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    return getCrewDisabledReason({ asteroid, crew });
  }, [_disabled, asteroid, crew]);

  return (
    <ActionButton
      label={labelDict[constructionStatus]}
      labelAddendum={disabledReason}
      flags={{
        disabled: disabledReason,
        loading: constructionStatus === 'CANCELING'
      }}
      icon={<UnplanBuildingIcon />}
      onClick={handleClick} />
  );
};

export default { Component: UnplanBuilding, isVisible };