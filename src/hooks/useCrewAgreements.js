import { useQuery } from 'react-query';

import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';

const useCrewAgreements = (otherCrew = null, enabled = true) => {
  const { crew } = useCrewContext();

  const crewId = otherCrew?.id || crew?.id;
  const crewDelegatedTo = otherCrew?.Crew?.delegatedTo || crew?.Crew?.delegatedTo;
  return useQuery(
    [ 'agreements', crewId, crewDelegatedTo ],
    () => enabled ? api.getCrewAgreements(crewId, crewDelegatedTo) : undefined,
    { enabled: !!crewId && enabled }
  );
};

export default useCrewAgreements;
