import { useCallback, useMemo } from 'react';
import { CoreSample } from '@influenceth/sdk';

import { ExtractionIcon } from '~/components/Icons';
import useExtractionManager from '~/hooks/useExtractionManager';
import ActionButton from './ActionButton';

const labelDict = {
  READY: 'Extract Resource',
  EXTRACTING: 'Extracting...',
  READY_TO_FINISH: 'Finish Extraction',
  FINISHING: 'Finishing Extraction...'
};

const Extract = ({ onSetAction, asteroid, crew, plot, preselect, _disabled }) => {
  const { extractionStatus } = useExtractionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('EXTRACT_RESOURCE', { preselect });
  }, [onSetAction, preselect]);

  // badge shows full count of *useable* core samples of *any* resource on lot, owned by *anyone*
  // TODO: this should ideally also check for pending use of samples (i.e. in core sample improvement)
  const usableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => (
    c.owner === crew?.i
    && c.remainingYield > 0
    && c.status >= CoreSample.STATUS_FINISHED
  )), [plot?.coreSamples, crew?.i]);
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
        completionTime: plot?.building?.extraction?.completionTime
      }}
      icon={<ExtractionIcon />}
      onClick={handleClick} />
  );
};

export default Extract;