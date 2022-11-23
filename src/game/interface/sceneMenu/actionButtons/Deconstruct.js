import { useCallback } from 'react';

import { DeconstructIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Deconstruct = ({ onSetAction }) => {
  const loading = false;
  const handleClick = useCallback(() => {
    onSetAction('DECONSTRUCT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Deconstruct Building'}
      flags={{
        loading: loading || undefined
      }}
      icon={<DeconstructIcon />}
      onClick={handleClick} />
  );
};

export default Deconstruct;