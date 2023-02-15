import { createContext, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import { useCrewMemberAggregate } from '~/hooks/useCrewMember';
import useStore from '~/hooks/useStore';

const CrewContext = createContext();

export function CrewProvider({ children }) {
  const { account } = useAuth();
  const selectedCrewId = useStore(s => s.selectedCrewId);
  const dispatchCrewSelected = useStore(s => s.dispatchCrewSelected);

  const { data: allCrewMembers, isLoading: crewMembersLoading} = useCrewMemberAggregate(
    [ 'crewmembers', 'owned', account ],
    () => api.getOwnedCrewMembers(),
    { enabled: !!account }
  );

  const { data: crews, isLoading: crewsLoading } = useQuery(
    [ 'crews', 'owned', account ],
    () => api.getOwnedCrews(),
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

  const selectedCrew = useMemo(() => {
    return selectedCrewId && (crews || []).find((crew) => crew.i === selectedCrewId);
  }, [crews, selectedCrewId]);

  useEffect(() => {
    // if logged in and done loading and there are crews
    if (!crewsLoading && !crewMembersLoading) {
      if (account && crews?.length) {
        // if there is no selected crew, select default crew
        if (!selectedCrew) {
          const defaultCrew = crews.find((crew) => crew.crewMembers.length > 0);
          dispatchCrewSelected(defaultCrew?.i || crews[0].i);
        }
      } else {
        dispatchCrewSelected();
      }
    }
  }, [account, crews, crewsLoading, crewMembersLoading, dispatchCrewSelected, selectedCrew]);

  const captain = useMemo(() => {
    if (crewMemberMap && selectedCrew?.crewMembers?.length) {
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
      selectCrew: dispatchCrewSelected  // TODO: this might be redundant
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
