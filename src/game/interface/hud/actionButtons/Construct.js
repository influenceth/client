import { useCallback } from 'react';

import { ConstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  PLANNED: 'Start Construction',
  UNDER_CONSTRUCTION: 'Constructing...',
  READY_TO_FINISH: 'Finish Construction',
  FINISHING: 'Finishing Construction...'
};

const isVisible = ({ building, constructionStatus, crew }) => {
  // zoomStatus === 'in'?
  return crew && building
    && building.Control?.controller?.id === crew.id
    && building.DryDocks?.length > 0
    && ['PLANNED', 'UNDER_CONSTRUCTION', 'READY_TO_FINISH', 'FINISHING'].includes(constructionStatus);
};

const Component = ({ asteroid, crew, lot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('CONSTRUCT');
  }, [onSetAction]);

  const attention = constructionStatus === 'PLANNED' || constructionStatus === 'READY_TO_FINISH';
  const loading = constructionStatus === 'UNDER_CONSTRUCTION' || constructionStatus === 'FINISHING';
  const disabledReason = constructionStatus === 'PLANNED' && !crew?._ready ? 'crew is busy' : null;
  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      labelAddendum={disabledReason}
      flags={{
        disabled: _disabled || disabledReason || undefined,
        attention: attention || undefined,
        loading: loading || undefined,
        finishTime: lot?.building?.Building?.finishTime
      }}
      icon={<ConstructIcon />}
      onClick={handleClick} />
  );
};

export default { Component, isVisible };