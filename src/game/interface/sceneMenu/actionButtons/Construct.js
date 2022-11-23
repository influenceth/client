import { useCallback } from 'react';

import { ConstructIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const Construct = ({ onSetAction }) => {
  const loading = false;
  const handleClick = useCallback(() => {
    onSetAction('CONSTRUCT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Start Construction'}
      flags={{
        attention: loading ? undefined : true,
        loading: loading || undefined
      }}
      icon={<ConstructIcon />}
      onClick={handleClick} />
  );
};

export default Construct;