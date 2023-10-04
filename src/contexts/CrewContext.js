import { createContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Crewmate, Entity } from '@influenceth/sdk';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import { locationsArrToObj } from '~/lib/utils';

const CrewContext = createContext();

export function CrewProvider({ children }) {
  const { account } = useAuth();
  const selectedCrewId = useStore(s => s.selectedCrewId);
  const dispatchCrewSelected = useStore(s => s.dispatchCrewSelected);

  const { data: rawCrews, isLoading: crewsLoading } = useQuery(
    [ 'entities', Entity.IDS.CREW, 'owned', account ],
    () => api.getOwnedCrews(account),
    { enabled: !!account }
  );

  const combinedCrewRoster = useMemo(() => (rawCrews || []).reduce((acc, c) => [...acc, ...c.Crew.roster], []), [rawCrews]);
  const { data: allCrewmates, isLoading: crewmatesLoading } = useQuery(
    [ 'entities', Entity.IDS.CREWMATE, combinedCrewRoster.join(',') ],
    () => api.getCrewmates(combinedCrewRoster),
    { enabled: combinedCrewRoster?.length > 0 }
  );

  const { data: allRecruits, isLoading: recruitsLoading } = useQuery(
    [ 'entities', Entity.IDS.CREWMATE, 'uninitialized', account ],
    async () => {
      // return all account-owned crewmates that are not part of a crew (thus must need initialization)
      return (await api.getAccountCrewmates(account)).filter((c) => !c.Control?.controller?.id);
    },
    { enabled: !!account }
  );

  const [adalianRecruits, arvadianRecruits] = useMemo(() => {
    if (!allRecruits) return [[], []];
    return [
      allRecruits.filter((c) => !c.Crewmate.class),
      allRecruits.filter((c) => [
        Crewmate.COLLECTION_IDS.ARVAD_CITIZEN,
        Crewmate.COLLECTION_IDS.ARVAD_SPECIALIST,
        Crewmate.COLLECTION_IDS.ARVAD_LEADERSHIP
      ].includes(c.Crewmate.coll))
    ];
  }, [allRecruits]);

  const crewmateMap = useMemo(() => {
    if (!crewsLoading && !crewmatesLoading) {
      const allMyCrewmates = {};
      (allCrewmates || []).forEach((crewmate) => allMyCrewmates[crewmate.id] = crewmate);
      return allMyCrewmates;
    }
    return null;
  }, [allCrewmates, crewmatesLoading]);

  const crews = useMemo(() => {
    if (!rawCrews || !crewmateMap) return [];
    return rawCrews.map((c) => {
      if (!!crewmateMap) {
        c._crewmates = c.Crew.roster.map((i) => crewmateMap[i]).filter((c) => !!c);
      }
      if (c.Location?.locations) {
        c._location = locationsArrToObj(c.Location.locations);
      }
      return c;
    })
  }, [rawCrews, crewmateMap]);

  const selectedCrew = useMemo(() => {
    if (crews && crews.length > 0) {
      if (selectedCrewId) {
        return crews.find((crew) => crew.id === selectedCrewId);
      }
      return crews.find((crew) => crew.Crew.roster.length > 0) || crews[0];
    }
    return null;
  }, [crews, selectedCrewId]);

  // make sure a default-selected crew makes it into state
  useEffect(() => {
    if (!crewsLoading && selectedCrew?.id !== selectedCrew) {
      dispatchCrewSelected(selectedCrew?.id || undefined);
    }
  }, [crewsLoading, selectedCrewId, selectedCrew]);

  const captain = useMemo(() => selectedCrew?._crewmates?.[0] || null, [crewmateMap, selectedCrew]);

  return (
    <CrewContext.Provider value={{
      adalianRecruits,
      arvadianRecruits,
      captain,
      crew: selectedCrew,
      crews,
      crewmateMap,
      loading: crewsLoading || crewmatesLoading || recruitsLoading,
      selectCrew: dispatchCrewSelected  // TODO: this might be redundant
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
