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
    () => api.getCrewmatesByCrewIds(crews.map((c) => c.i)),
    { enabled: crews?.length > 0 }
  );

  const crewmateMap = useMemo(() => {
    if (!crewmatesLoading) {
      const roster = {};
      (allCrewmates || []).forEach((crewmate) => roster[crewmate.i] = crewmate);
      return roster;
    }
    return null;
  }, [allCrewmates, crewmatesLoading]);

  const selectedCrew = useMemo(() => {
    return selectedCrewId && (crews || []).find((crew) => crew.i === selectedCrewId);
  }, [crews, selectedCrewId]);

  // TODO: vvv remove this
  // NOTE: either shipId or (asteroidId and lotId) must be set
  if (selectedCrew) {
    selectedCrew.station = {
      asteroidId: 1000,
      lotId: 123,
      shipId: 123
    };
  }
  // ^^^

  useEffect(() => {
    // if logged in and done loading and there are crews
    if (!crewsLoading && !crewmatesLoading) {
      if (account && crews?.length) {
        // if there is no selected crew, select default crew
        if (!selectedCrew) {
          const defaultCrew = crews.find((crew) => crew.crewmates.length > 0);
          dispatchCrewSelected(defaultCrew?.i || crews[0].i);
        }
      } else {
        dispatchCrewSelected();
      }
    }
  }, [account, crews, crewsLoading, crewmatesLoading, dispatchCrewSelected, selectedCrew]);

  const captain = useMemo(() => {
    if (crewmateMap && selectedCrew?.crewmates?.length) {
      return crewmateMap[selectedCrew.crewmates[0]];
    }
    return null;
  }, [crewmateMap, selectedCrew]);

  return (
    <CrewContext.Provider value={{
      captain,
      crew: selectedCrew,
      crews,
      crewmateMap,
      loading: crewsLoading || crewmatesLoading,
      selectCrew: dispatchCrewSelected  // TODO: this might be redundant
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
