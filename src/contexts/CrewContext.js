import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Crewmate, Entity, Permission, System } from '@influenceth/sdk';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useConstants from '~/hooks/useConstants';
import useEntity from '~/hooks/useEntity';
import useStore from '~/hooks/useStore';
import { getCrewAbilityBonuses, locationsArrToObj } from '~/lib/utils';

const CrewContext = createContext();

const getNow = () => Math.ceil(Date.now() / 1000);

export function CrewProvider({ children }) {
  const { account, walletContext: { starknet } } = useAuth();
  const queryClient = useQueryClient();

  const selectedCrewId = useStore(s => s.selectedCrewId);
  const dispatchCrewSelected = useStore(s => s.dispatchCrewSelected);

  const { data: TIME_ACCELERATION, isLoading: constantsLoading } = useConstants('TIME_ACCELERATION');

  const ownedCrewsQueryKey = useMemo(() => ([ 'entities', Entity.IDS.CREW, 'owned', account ]), [account]);

  const { data: rawCrews, isLoading: crewsLoading } = useQuery(
    ownedCrewsQueryKey,
    () => api.getOwnedCrews(account),
    { enabled: !!account }
  );

  const combinedCrewRoster = useMemo(() => (rawCrews || []).reduce((acc, c) => [...acc, ...c.Crew.roster], []), [rawCrews]);
  const { data: myCrewCrewmates, isLoading: crewmatesLoading } = useQuery(
    [ 'entities', Entity.IDS.CREWMATE, combinedCrewRoster.join(',') ], // TODO: joined key
    () => api.getCrewmates(combinedCrewRoster),
    { enabled: combinedCrewRoster?.length > 0 }
  );

  const { data: myOwnedCrewmates, isLoading: myOwnedCrewmatesLoading } = useQuery(
    [ 'entities', Entity.IDS.CREWMATE, 'owned', account ],
    () => api.getAccountCrewmates(account),
    { enabled: !!account }
  );

  const [adalianRecruits, arvadianRecruits] = useMemo(() => {
    if (!myOwnedCrewmates) return [[], []];
    const allRecruits = myOwnedCrewmates.filter((c) => !c.Control?.controller?.id);
    return [
      allRecruits.filter((c) => !c.Crewmate.class),
      allRecruits.filter((c) => [
        Crewmate.COLLECTION_IDS.ARVAD_CITIZEN,
        Crewmate.COLLECTION_IDS.ARVAD_SPECIALIST,
        Crewmate.COLLECTION_IDS.ARVAD_LEADERSHIP
      ].includes(c.Crewmate.coll))
    ];
  }, [myOwnedCrewmates]);

  const crewmateMap = useMemo(() => {
    if (!crewsLoading && !crewmatesLoading && !myOwnedCrewmatesLoading) {
      const map = {};
      (myCrewCrewmates || []).forEach((crewmate) => {
        if (!map[crewmate.id]) map[crewmate.id] = crewmate;
      });
      (myOwnedCrewmates || []).forEach((crewmate) => {
        if (!map[crewmate.id]) map[crewmate.id] = crewmate;
      });
      return map;
    }
    return null;
  }, [myCrewCrewmates, myOwnedCrewmates, crewsLoading, crewmatesLoading, myOwnedCrewmatesLoading]);

  // NOTE: this covers all queries' loading states because crewmateMap is
  // null while any of those are true
  const crewsAndCrewmatesReady = useMemo(() => !!crewmateMap && TIME_ACCELERATION, [crewmateMap, TIME_ACCELERATION]);

  // update crews' _ready value at next readyAt
  // TODO: getNows() should really be getter from usechaintime
  const [nextReadyAt, setNextReadyAt] = useState(Infinity);
  const refreshNextReadyAt = useCallback(() => {
    if (!crewsAndCrewmatesReady || !rawCrews) return;
    const now = getNow();
    const val = rawCrews.reduce((acc, c) => now > c.Crew.readyAt ? acc : Math.min(acc, c.Crew.readyAt), Infinity);
    setNextReadyAt(val);
  }, [crewsAndCrewmatesReady, rawCrews]);
  useEffect(() => {
    const toTime = nextReadyAt ? Math.max(0, nextReadyAt - getNow() + 1) : 0;
    const to = setTimeout(() => { refreshNextReadyAt(); }, toTime * 1000);
    return () => {
      if (to) clearTimeout(to);
    };
  }, [nextReadyAt, refreshNextReadyAt]);

  const crews = useMemo(() => {
    if (!crewsAndCrewmatesReady || !rawCrews) return [];
    const now = getNow();
    return rawCrews.map((c) => {
      if (!!crewmateMap) {
        c._crewmates = c.Crew.roster.map((i) => crewmateMap[i]).filter((c) => !!c);

        const foodBonuses = getCrewAbilityBonuses([Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME, Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY], c);
        c._foodBonuses = {
          consumption: foodBonuses[Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME]?.crewmatesMultiplier,
          rationing: foodBonuses[Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY]?.crewmatesMultiplier
        };
      }
      if (c.Location?.locations) {
        c._location = locationsArrToObj(c.Location.locations);
      }
      if (c.Crew) {
        c._ready = now > c.Crew.readyAt;
      }
      return c;
    })
  }, [rawCrews, crewmateMap, crewsAndCrewmatesReady, nextReadyAt]);

  const selectedCrew = useMemo(() => {
    if (crews && crews.length > 0) {
      if (selectedCrewId) {
        const previouslySelected = crews.find((crew) => crew.id === selectedCrewId);
        if (previouslySelected) return previouslySelected;
      }
      return crews.find((crew) => crew.Crew.roster.length > 0) || crews[0];
    }
    return null;
  }, [crews, nextReadyAt, selectedCrewId]);

  // hydrate crew location so can attach station to crew
  const { data: selectedCrewLocation } = useEntity(selectedCrew ? { ...selectedCrew.Location.location } : undefined);
  
  const lastBlockNumber = 0;
  const [actionTypeTriggered, setActionTypeTriggered] = useState(false);
  useEffect(() => {
    if (!actionTypeTriggered) {
      if (selectedCrew?.Crew?.actionType && selectedCrew.Crew.actionRound && selectedCrew.Crew.actionRound <= lastBlockNumber) {
        starknet.account.provider.callContract(
          System.getRunSystemCall(
            'CheckForRandomEvent',
            { caller_crew: { id: selectedCrew.id, label: selectedCrew.label }},
            process.env.REACT_APP_STARKNET_DISPATCHER
          )
        )
        .then((response) => {
          // TODO: (should have type that can do something with)
          console.log('CheckForRandomEvent', response);
          window.alert('check RandomEvent response');
          if (response) {
            setActionTypeTriggered({
              actionType: selectedCrew.Crew.actionType,
              pendingEvent: response,
              timestamp: Date.now() / 1000  // TODO: at worst, use block time here (will change if refresh); ideally, use block time of actionRound
            });
          }
        })
        .catch((err) => {
          console.warn('CheckForRandomEvent', err);
          // (wasTriggered can stay false)
        });
      }
    }
  }, [selectedCrew?.Crew?.actionType, selectedCrew?.Crew?.actionRound, lastBlockNumber]);

  // add final data to selected crew
  const finalSelectedCrew = useMemo(() => {
    if (!selectedCrew) return null;
    return {
      ...selectedCrew,
      // _actionTypeTriggered: actionTypeTriggered,
      _actionTypeTriggered: {
        actionType: 1,
        pendingEvent: 1,
        timestamp: Date.now() / 1000  // TODO: at worst, use block time here (will change if refresh); ideally, use block time of actionRound
      },
      _station: selectedCrewLocation?.Station || {},
      _timeAcceleration: parseInt(TIME_ACCELERATION) // (attach to crew for easy use in bonus calcs)
    }
  }, [actionTypeTriggered, selectedCrew, selectedCrew?._ready, selectedCrewLocation, TIME_ACCELERATION]);

  const refreshReadyAt = useCallback(async () => {
    const updatedCrew = await api.getEntityById({ label: Entity.IDS.CREW, id: selectedCrewId, components: ['Crew'] });
    if (updatedCrew) {
      queryClient.setQueryData(ownedCrewsQueryKey, (prevRawCrews = []) => {
        return prevRawCrews.map((c) => {
          if (c.id === updatedCrew.id) {
            c.Crew.lastFed = updatedCrew.Crew.lastFed;
            c.Crew.readyAt = updatedCrew.Crew.readyAt;

            // update nextReadyAt if this crew's readyAt is sooner
            if (c.Crew.readyAt > getNow() && c.Crew.readyAt < nextReadyAt) {
              setNextReadyAt(c.Crew.readyAt);
            }

          }
          return c;
        });
      });

    }
  }, [nextReadyAt, selectedCrewId]);

  // make sure a default-selected crew makes it into state (if logged in)
  useEffect(() => {
    if (account && crewsAndCrewmatesReady && selectedCrew?.id !== selectedCrew) {
      dispatchCrewSelected(selectedCrew?.id || undefined);
    }
  }, [account, crewsAndCrewmatesReady, selectedCrew]);

  const captain = useMemo(() => selectedCrew?._crewmates?.[0] || null, [crewmateMap, selectedCrew]);

  const crewCan = useCallback(
    (permission, hydratedTarget) => finalSelectedCrew ? Permission.isPermitted(finalSelectedCrew, permission, hydratedTarget) : false,
    [finalSelectedCrew]
  );

  return (
    <CrewContext.Provider value={{
      adalianRecruits,
      arvadianRecruits,
      captain,
      crew: finalSelectedCrew,
      crewCan,
      crews,
      crewmateMap,
      loading: !crewsAndCrewmatesReady,
      refreshReadyAt,
      selectCrew: dispatchCrewSelected  // TODO: this might be redundant
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
