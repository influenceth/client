import { useCallback } from 'react';

import { ConstructIcon } from '~/components/Icons';
import useConstructionManager from '~/hooks/useConstructionManager';
import ActionButton from './ActionButton';

const labelDict = {
  PLANNED: 'Start Construction',
  UNDER_CONSTRUCTION: 'Constructing...',
  READY_TO_FINISH: 'Finish Construction',
  FINISHING: 'Finishing Construction...'
};

const Construct = ({ asteroid, plot, onSetAction, _disabled }) => {
  const { constructionStatus } = useConstructionManager(asteroid?.i, plot?.i);
  const handleClick = useCallback(() => {
    onSetAction('CONSTRUCT');
  }, [onSetAction]);

  const attention = constructionStatus === 'PLANNED' || constructionStatus === 'READY_TO_FINISH';
  const badge = constructionStatus === 'READY_TO_FINISH' ? '✓' : 0;
  const loading = constructionStatus === 'UNDER_CONSTRUCTION' || constructionStatus === 'FINISHING';
  return (
    <ActionButton
      label={labelDict[constructionStatus] || undefined}
      flags={{
        badge,
        disabled: _disabled || undefined,
        attention: attention || undefined,
        loading: loading || undefined
      }}
      icon={<ConstructIcon />}
      onClick={handleClick} />
  );
};

export default Construct;