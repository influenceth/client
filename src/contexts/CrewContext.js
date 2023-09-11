import { createContext, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

const CrewContext = createContext();

export function CrewProvider({ children }) {
  const { account } = useAuth();
  const selectedCrewId = useStore(s => s.selectedCrewId);
  const dispatchCrewSelected = useStore(s => s.dispatchCrewSelected);

  const { data: crews, isLoading: crewsLoading } = useQuery(
    [ 'crews', 'owned', account ],
    () => api.getOwnedCrews(account),
    { enabled: !!account }
  );

  const { data: allCrewmates, isLoading: crewmatesLoading } = useQuery(
    [ 'crewmates', 'owned', account ],
    () => api.getCrewmates(crews.reduce((acc, c) => [...acc, ...c.Crew.roster], [])),
    { enabled: crews?.length > 0 }
  );

  const { data: selectedCrewLocation, isLoading: crewLocationLoading } = useQuery(
    [ 'crewLocation', selectedCrewId ],
    () => api.getCrewLocation(selectedCrewId),
    { enabled: !!selectedCrewId }
  );

  const crewmateMap = useMemo(() => {
    if (!crewmatesLoading) {
      const allMyCrewmates = {};
      (allCrewmates || []).forEach((crewmate) => allMyCrewmates[crewmate.i] = crewmate);
      return allMyCrewmates;
    }
    return null;
  }, [allCrewmates, crewmatesLoading]);

  const selectedCrew = useMemo(() => {
    if (selectedCrewId) {
      const crew = (crews || []).find((crew) => crew.i === selectedCrewId);
      if (crew) {
        if (!!crewmateMap) {
          crew._crewmates = crew.Crew.roster.map((i) => crewmateMap[i]);
        }
        if (!!selectedCrewLocation) {
          crew._location = selectedCrewLocation;
        }
        return crew;
      }
    }
    return null;
  }, [crews, selectedCrewId, !!crewmateMap, !!selectedCrewLocation]);

  useEffect(() => {
    // if logged in and done loading and there are crews
    if (!crewsLoading && !crewmatesLoading) {
      if (account && crews?.length) {
        // if there is no selected crew, select default crew
        if (!selectedCrew) {
          const defaultCrew = crews.find((crew) => crew.Crew.roster.length > 0);
          dispatchCrewSelected(defaultCrew?.i || crews[0].i);
        }
      } else {
        dispatchCrewSelected();
      }
    }
  }, [account, crews, crewsLoading, crewmatesLoading, dispatchCrewSelected, selectedCrew]);

  const captain = useMemo(() => selectedCrew?._crewmates?.[0] || null, [crewmateMap, selectedCrew]);

  return (
    <CrewContext.Provider value={{
      captain,
      crew: selectedCrew,
      crews,
      crewmateMap,
      loading: crewsLoading || crewmatesLoading || crewLocationLoading,
      selectCrew: dispatchCrewSelected  // TODO: this might be redundant
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
