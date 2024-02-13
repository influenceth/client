import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { AssetAgreementsIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useControlAsteroid from '~/hooks/actionManagers/useControlAsteroid';
import ActionButton from './ActionButton';

const isVisible = () => false;

const ViewAgreements = ({ entity, permission, tally, _disabled }) => {
  const history = useHistory();
  const handleClick = useCallback(() => {
    history.push(`/listview/agreements?uuid=${entity.uuid}&permission=${permission}`)
  }, [entity, permission]);

  return (
    <ActionButton
      label="View Agreements"
      flags={{
        badge: tally,
        disabled: _disabled
      }}
      icon={<AssetAgreementsIcon />}
      onClick={handleClick} />
  );
};

export default { Component: ViewAgreements, isVisible };