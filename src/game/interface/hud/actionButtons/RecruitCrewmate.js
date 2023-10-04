import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { CrewmateIcon } from '~/components/Icons';  // TODO: sergey's
import useCrewManager from '~/hooks/useCrewManager';
import ActionButton from './ActionButton';

const RecruitCrewmate = ({ crew, lot }) => {
  const { getPendingCrewmate } = useCrewManager();
  const history = useHistory();

  const handleClick = useCallback(() => {
    history.push(`/recruit/${crew?.id || 0}/${lot?.building?.id}`)
  }, [crew?.id, lot?.building?.id]);

  const pendingCrewmate = useMemo(getPendingCrewmate, [getPendingCrewmate]);

  return (
    <ActionButton
      label="Recruit Crewmate"
      flags={{
        attention: !pendingCrewmate && !crew?._roster?.length,
        disabled: !!pendingCrewmate,
        loading: !!pendingCrewmate,
      }}
      icon={<CrewmateIcon />}
      onClick={handleClick} />
  );
};

export default RecruitCrewmate;