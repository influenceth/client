import { useCallback } from 'react';

import { LayBlueprintIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const NewBlueprint = ({ onSetAction }) => {
  const loading = false;
  const handleClick = useCallback(() => {
    onSetAction('BLUEPRINT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Lay Blueprint'}
      flags={{
        loading: loading || undefined
      }}
      icon={<LayBlueprintIcon />}
      onClick={handleClick} />
  );
};

export default NewBlueprint;