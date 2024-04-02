import { useQuery } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useCrewAgreements = (otherCrew = null, enabled = true) => {
  const { crew } = useCrewContext();

  const crewId = otherCrew?.id || crew?.id;
  return useQuery(
    [ 'agreements', crewId ],
    () => enabled ? api.getCrewAgreements(crewId) : undefined,
    { enabled: !!crewId && enabled }
  );
};

export default useCrewAgreements;
