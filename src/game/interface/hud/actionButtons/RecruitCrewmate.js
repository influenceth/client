import { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { RecruitCrewmateIcon } from '~/components/Icons';  // TODO: sergey's
import useCrewManager from '~/hooks/useCrewManager';
import ActionButton from './ActionButton';
import { nativeBool, reactBool } from '~/lib/utils';

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
        attention: reactBool(!pendingCrewmate && !(crew?.Crew?.roster?.length > 0)),
        disabled: nativeBool(!!pendingCrewmate),
        loading: reactBool(!!pendingCrewmate),
      }}
      icon={<RecruitCrewmateIcon />}
      onClick={handleClick} />
  );
};

export default RecruitCrewmate;