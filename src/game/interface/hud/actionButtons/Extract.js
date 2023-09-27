import { useCallback, useMemo } from 'react';
import { Deposit } from '@influenceth/sdk';

import { ExtractionIcon } from '~/components/Icons';
import useExtractionManager from '~/hooks/useExtractionManager';
import ActionButton from './ActionButton';

const labelDict = {
  READY: 'Extract Resource',
  EXTRACTING: 'Extracting...',
  READY_TO_FINISH: 'Finish Extraction',
  FINISHING: 'Finishing Extraction...'
};

// TODO: for multiple extractors, need one of these (and an extraction manager) per extractor
const Extract = ({ onSetAction, asteroid, crew, lot, preselect, _disabled }) => {
  const { extractionStatus } = useExtractionManager(asteroid?.i, lot?.i);
  const handleClick = useCallback(() => {
    onSetAction('EXTRACT_RESOURCE', { preselect });
  }, [onSetAction, preselect]);

  // badge shows full count of *useable* core samples of *any* resource on lot, owned by *anyone*
  // TODO: this should ideally also check for pending use of samples (i.e. in core sample improvement)
  const usableSamples = useMemo(() => (lot?.deposits || []).filter((c) => (
    c.Deposit.remainingYield > 0 && c.Deposit.status >= Deposit.STATUSES.SAMPLED
  )), [lot?.coreSamples, crew?.i]);

  // add attention flag if any of those ^ are mine
  const myUsableSamples = useMemo(() => usableSamples.filter((c) => c.owner === crew?.i), [crew?.i, usableSamples]);

  const attention = !_disabled && (extractionStatus === 'READY_TO_FINISH' || (myUsableSamples?.length > 0) && extractionStatus === 'READY');
  const badge = ((extractionStatus === 'READY' && !preselect) ? usableSamples?.length : 0);
  const disabled = extractionStatus === 'READY' && (myUsableSamples?.length === 0);
  const loading = ['EXTRACTING', 'FINISHING'].includes(extractionStatus);
  return (
    <ActionButton
      label={`${labelDict[extractionStatus]}${disabled ? ' (requires core sample)' : ''}`}
      flags={{
        badge,
        disabled: _disabled || disabled || undefined,
        attention: attention || undefined,
        loading: loading || undefined,
        finishTime: lot?.building?.Extractors[0]?.finishTime
      }}
      icon={<ExtractionIcon />}
      onClick={handleClick} />
  );
};

export default Extract;