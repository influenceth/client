import { useCallback, useMemo, useState } from 'react';

import { ConstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import Coachmarks, { COACHMARK_IDS } from '~/Coachmarks';

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

const Construct = ({ asteroid, crew, lot, onSetAction, simulation, simulationActions, _disabled }) => {
  const { constructionStatus } = useConstructionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('CONSTRUCT');
  }, [onSetAction]);

  const disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (constructionStatus === 'PLANNED') {
      return getCrewDisabledReason({
        asteroid,
        crew,
        isAllowedInSimulation: simulationActions.includes('Construct'),
        isSequenceable: true
      });
    }
    return '';
  }, [_disabled, asteroid, constructionStatus, crew, simulationActions]);

  const attention = !disabledReason && (simulation || constructionStatus === 'READY_TO_FINISH');
  const loading = constructionStatus === 'UNDER_CONSTRUCTION' || constructionStatus === 'FINISHING';
  const [refEl, setRefEl] = useState();
  return (
    <>
      <ActionButton
        ref={setRefEl}
        label={labelDict[constructionStatus]}
        labelAddendum={disabledReason}
        flags={{
          disabled: disabledReason,
          attention,
          loading,
          finishTime: lot?.building?.Building?.finishTime
        }}
        icon={<ConstructIcon />}
        onClick={handleClick}
        sequenceMode={!crew?._ready && constructionStatus === 'PLANNED'} />
      <Coachmarks label={COACHMARK_IDS.actionButtonConstruct} refEl={refEl} />
    </>
  );
};

export default { Component: Construct, isVisible };