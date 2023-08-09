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
  if (selectedCrew) {
    // NOTE: this is default location component
    selectedCrew.Location = {
      location: {
        label: 'asteroid',
        id: 1000
      }
    };

    // TODO: fill in recursively-flattened location for crew as _location
    selectedCrew._location = {
      asteroidId: 1000,
      lotId: 1000,
      buildingId: 1000,
      shipId: 1000
    }
  }
  // ^^^

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

  const captain = useMemo(() => {
    if (crewmateMap && selectedCrew?.Crew?.roster?.length) {
      return crewmateMap[selectedCrew?.Crew?.roster[0]];
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
