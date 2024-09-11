import { useCallback } from '~/lib/react-debug';
import { useHistory } from 'react-router-dom';

import { AgreementsListIcon } from '~/components/Icons';
import ActionButton from './ActionButton';

const isVisible = () => false;

const ViewAgreements = ({ entity, permission, tally, _disabled }) => {
  const history = useHistory();
  const handleClick = useCallback(import.meta.url, () => {
    history.push(`/listview/agreements?uuid=${entity.uuid}&permission=${permission}`)
  }, [entity, permission]);

  return (
    <ActionButton
      label="View Agreements"
      flags={{
        badge: tally,
        disabled: _disabled
      }}
      icon={<AgreementsListIcon /> }
      onClick={handleClick} />
  );
};

export default { Component: ViewAgreements, isVisible };