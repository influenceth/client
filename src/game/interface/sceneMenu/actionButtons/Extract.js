import { useCallback, useMemo } from 'react';
import { CoreSample } from '@influenceth/sdk';

import { ExtractionIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Extract = ({ onSetAction, crew, plot }) => {
  const extracting = false;
  const handleClick = useCallback(() => {
    onSetAction('EXTRACT_RESOURCE');
  }, [onSetAction]);

  // badge shows full count of *useable* core samples of *any* resource on lot, owned by *anyone*
  const usableSamples = useMemo(() => (plot?.coreSamples || []).filter((c) => c.status === CoreSample.STATUS_FINISHED), [plot?.coreSamples]);
  // add attention flag if any of those ^ are mine
  const myUsableSamples = useMemo(() => usableSamples.filter((c) => c.owner === crew?.i), [crew?.i, usableSamples]);

  return (
    <ActionButton
      label={'Extract Resource'}
      flags={{
        badge: usableSamples?.length,
        attention: ((myUsableSamples?.length > 0) && !extracting) || undefined,
        loading: extracting || undefined,
      }}
      icon={<ExtractionIcon />}
      onClick={handleClick} />
  );
};

export default Extract;