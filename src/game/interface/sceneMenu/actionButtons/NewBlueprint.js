import { useCallback } from 'react';

import { LayBlueprintIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const NewBlueprint = ({ asteroid, plot, onSetAction }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('BLUEPRINT');
  }, [onSetAction]);

  return (
    <ActionButton
      label={'Lay Blueprint'}
      flags={{
        loading: constructionStatus === 'PLANNING' || undefined
      }}
      icon={<LayBlueprintIcon />}
      onClick={handleClick} />
  );
};

export default NewBlueprint;