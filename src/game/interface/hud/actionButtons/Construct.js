import { useCallback, useMemo } from 'react';

import { ConstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';

const labelDict = {
  PLANNED: 'Start Construction',
  UNDER_CONSTRUCTION: 'Constructing...',
  READY_TO_FINISH: 'Finish Construction',
  FINISHING: 'Finishing Construction...'
};

const isVisible = ({ constructionStatus, crew, lot }) => {
  return crew && lot && lot.building
    && lot.building.Control?.controller?.id === crew.id
    && ['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus);
};

const Construct = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('CONSTRUCT');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    return constructionStatus === 'PLANNED' ? getCrewDisabledReason({ asteroid, crew, isSequenceable: true }) : '';
  }, [_disabled, asteroid, constructionStatus, crew]);

  const attention = !disabledReason && constructionStatus === 'READY_TO_FINISH';
  const loading = constructionStatus === 'UNDER_CONSTRUCTION' || constructionStatus === 'FINISHING';
  return (
    <ActionButton
      label={labelDict[constructionStatus]}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason,
        attention,
        loading,
        finishTime: lot?.building?.Building?.finishTime
      }}
      icon={<ConstructIcon />}
      onClick={handleClick}
      sequenceMode={!crew?._ready && constructionStatus === 'PLANNED'} />
  );
};

export default { Component: Construct, isVisible };