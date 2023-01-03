import { useCallback, useMemo } from 'react';
import { CoreSample } from '@influenceth/sdk';

import { ExtractionIcon } from '~/components/Icons';
import useExtractionManager from '~/hooks/useExtractionManager';
import ActionButton from './ActionButton';

const Extract = ({ onSetAction, asteroid, crew, plot }) => {
  const { extractionStatus } = useExtractionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('EXTRACT_RESOURCE');
  }, [onSetAction]);

  // badge shows full count of *useable* core samples of *any* resource on lot, owned by *anyone*
  const usableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => c.remainingYield > 0), [plot?.coreSamples]);
  // add attention flag if any of those ^ are mine
  const myUsableSamples = useMemo(() => usableSamples.filter((c) => c.owner === crew?.i), [crew?.i, usableSamples]);

  const attention = extractionStatus === 'READY_TO_FINISH' || (myUsableSamples?.length > 0) && extractionStatus === 'READY';
  const loading = ['EXTRACTING', 'FINISHING'].includes(extractionStatus);
  return (
    <ActionButton
      label="Extract Resource"
      flags={{
        badge: usableSamples?.length,
        attention: attention || undefined,
        loading: loading || undefined,
      }}
      icon={<ExtractionIcon />}
      onClick={handleClick} />
  );
};

export default Extract;