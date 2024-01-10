import { useCallback, useMemo } from 'react';
import { Deposit } from '@influenceth/sdk';

import { ExtractionIcon } from '~/components/Icons';
import useExtractionManager from '~/hooks/actionManagers/useExtractionManager';
import ActionButton, { getCrewDisabledReason } from './ActionButton';
import useCrewContext from '~/hooks/useCrewContext';

const labelDict = {
  READY: 'Extract Resource',
  EXTRACTING: 'Extracting...',
  READY_TO_FINISH: 'Finish Extraction',
  FINISHING: 'Finishing Extraction...'
};

const isVisible = ({ building, crew }) => {
  // zoomStatus === 'in'?
  return crew && building
    && building.Control?.controller?.id === crew.id // TODO: policy instead of control
    && building.Extractors?.length > 0;
};

// TODO: for multiple extractors, need one of these (and an extraction manager) per extractor
const Extract = ({ onSetAction, asteroid, crew, lot, preselect, _disabled }) => {
  const { extractionStatus } = useExtractionManager(lot?.id);
  const handleClick = useCallback(() => {
    onSetAction('EXTRACT_RESOURCE', { preselect });
  }, [onSetAction, preselect]);

  // badge shows full count of *useable* core samples of *any* resource on lot, owned by *anyone*
  // TODO: this should ideally also check for pending use of samples (i.e. in core sample improvement)
  const usableSamples = useMemo(() => (lot?.deposits || []).filter((c) => (
    c.Deposit.status >= Deposit.STATUSES.SAMPLED && c.Deposit.remainingYield > 0
  )), [lot?.coreSamples, crew?.id]);

  // add attention flag if any of those ^ are mine
  const myUsableSamples = useMemo(() => usableSamples.filter((c) => c.Control.controller.id === crew?.id), [crew?.id, usableSamples]);

  const attention = !_disabled && (extractionStatus === 'READY_TO_FINISH' || (myUsableSamples?.length > 0) && extractionStatus === 'READY');
  const badge = ((extractionStatus === 'READY' && !preselect) ? usableSamples?.length : 0);
  let disabledReason = useMemo(() => {
    if (_disabled) return 'loading...';
    if (extractionStatus === 'READY') {
      if (myUsableSamples?.length === 0) return 'requires core sample';
      return getCrewDisabledReason({ asteroid, crew });
    }
  }, [_disabled, crew, extractionStatus, lot?.building?.Extractors, myUsableSamples?.length]);
  
  const loading = ['EXTRACTING', 'FINISHING'].includes(extractionStatus);
  return (
    <ActionButton
      label={`${labelDict[extractionStatus]}`}
      labelAddendum={disabledReason}
      flags={{
        badge,
        disabled: disabledReason || undefined,
        attention: attention || undefined,
        loading: loading || undefined,
        finishTime: lot?.building?.Extractors?.[0]?.finishTime
      }}
      icon={<ExtractionIcon />}
      onClick={handleClick} />
  );
};

export default { Component: Extract, isVisible };