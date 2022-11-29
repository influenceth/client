import { useCallback } from 'react';

import { ExtractionIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Extract = ({ onSetAction }) => {
  const extracting = false;
  const handleClick = useCallback(() => {
    onSetAction('EXTRACT_RESOURCE');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Extract Resource'}
      flags={{
        loading: extracting || undefined
      }}
      icon={<ExtractionIcon />}
      onClick={handleClick} />
  );
};

export default Extract;