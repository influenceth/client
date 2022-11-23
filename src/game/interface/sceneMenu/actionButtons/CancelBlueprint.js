import { useCallback } from 'react';

import { CancelBlueprintIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const CancelBlueprint = ({ onSetAction }) => {
  const loading = false;
  const handleClick = useCallback(() => {
    onSetAction('CANCEL_BLUEPRINT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Cancel Blueprint'}
      flags={{
        loading: loading || undefined
      }}
      icon={<CancelBlueprintIcon />}
      onClick={handleClick} />
  );
};

export default CancelBlueprint;