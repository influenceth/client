import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

const CrewContext = createContext();

export function CrewProvider({ children }) {
  const { account } = useAuth();
  const selectedCrewId = useStore(s => s.selectedCrewId);
  const dispatchCrewSelected = useStore(s => s.dispatchCrewSelected);

  const [selectedCrew, setSelectedCrew] = useState();

  const { data: allCrewMembers, isLoading: crewMembersLoading } = useQuery(
    [ 'crew', 'search', { owner: account } ],
    () => api.getCrewMembers({ owner: account }),
    { enabled: !!account }
  );

  const { data: crews, isLoading: crewsLoading } = useQuery(
    [ 'crews', account ],
    () => api.getCrews(),
    { enabled: !!account }
  );

  const crewMemberMap = useMemo(() => {
    if (!crewMembersLoading) {
      const roster = {};
      (allCrewMembers || []).forEach((crewMember) => roster[crewMember.i] = crewMember);
      return roster;
    }
    return null;
  }, [allCrewMembers, crewMembersLoading]);

  const selectCrew = useCallback((crewId) => {
    dispatchCrewSelected(crewId);
  }, []);
  
  useEffect(() => {
    if (account && !crewsLoading && !crewMembersLoading && crews?.length) {
      if (selectedCrewId) {
        const select = crews.find((crew) => crew.i === selectedCrewId);
        if (select) {
          setSelectedCrew(select);
          return;
        }
      }

      // if get here, select default crew
      const defaultCrew = crews.find((crew) => crew.crewMembers.length > 0);
      selectCrew(defaultCrew?.i || crews[0].i);
    }
  }, [account, crews, crewsLoading, crewMembersLoading, selectCrew, selectedCrewId]);

  const captain = useMemo(() => {
    if (selectedCrew?.crewMembers?.length) {
      return crewMemberMap[selectedCrew.crewMembers[0]];
    }
    return null;
  }, [crewMemberMap, selectedCrew]);

  return (
    <CrewContext.Provider value={{
      captain,
      crew: selectedCrew,
      crews,
      crewMemberMap,
      loading: crewsLoading || crewMembersLoading,
      selectCrew
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
