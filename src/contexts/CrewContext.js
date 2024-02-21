import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Crewmate, Entity, Permission, RandomEvent, System } from '@influenceth/sdk';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useConstants from '~/hooks/useConstants';
import useEntity from '~/hooks/useEntity';
import useStore from '~/hooks/useStore';
import { earlyAccessJSTime, getBlockTime, getCrewAbilityBonuses, locationsArrToObj, openAccessJSTime } from '~/lib/utils';

const CrewContext = createContext();

export function CrewProvider({ children }) {
  const { account, walletContext: { starknet, blockNumber, blockTime } } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => { console.log({ blockTime, blockNumber }) }, [blockNumber, blockTime])

  const allPendingTransactions = useStore(s => s.pendingTransactions);
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

  // update crews' _ready value
  const crews = useMemo(() => {
    if (!crewsAndCrewmatesReady || !rawCrews) return [];
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
        c._ready = blockTime >= c.Crew.readyAt;
      }

      // TODO: vvv remove this whole block (and _launched references) after
      // only relevant on Sepolia
      if (`${process.env.REACT_APP_CHAIN_ID}` === `0x534e5f5345504f4c4941`) {
        // crew is early access eligible if...
        const earlyAccessEligible = !!c._crewmates.find((c) =>
          // ... has at least one arvadian crewmate
          [Crewmate.COLLECTION_IDS.ARVAD_CITIZEN, Crewmate.COLLECTION_IDS.ARVAD_SPECIALIST, Crewmate.COLLECTION_IDS.ARVAD_LEADERSHIP].includes(c.Crewmate.coll)
          // ... or has at least one "First Generation" adalian crewmate
          || c.Crewmate.title === 67
        );
        c._launched = blockTime > (earlyAccessEligible ? earlyAccessJSTime : openAccessJSTime) / 1e3;
        console.log({ earlyAccessEligible, crew: c, blockTime, earlyAccessJSTime, openAccessJSTime });
      } else {
        c._launched = true;
      }
      // ^^^

      return c;
    })
  }, [blockTime, rawCrews, crewmateMap, crewsAndCrewmatesReady]);

  const selectedCrew = useMemo(() => {
    if (crews && crews.length > 0) {
      if (selectedCrewId) {
        const previouslySelected = crews.find((crew) => crew.id === selectedCrewId);
        if (previouslySelected) return previouslySelected;
      }
      return crews.find((crew) => crew.Crew.roster.length > 0) || crews[0];
    }
    return null;
  }, [crews, selectedCrewId]);

  // hydrate crew location so can attach station to crew
  const { data: selectedCrewLocation } = useEntity(selectedCrew ? { ...selectedCrew.Location.location } : undefined);

  const [actionTypeTriggered, setActionTypeTriggered] = useState(false);
  useEffect(() => {
    if (!actionTypeTriggered) {
      if (selectedCrew?.Crew?.actionType && selectedCrew.Crew.actionRound && (selectedCrew.Crew.actionRound + RandomEvent.MIN_ROUNDS) <= blockNumber) {
        starknet.provider.callContract(
          System.getRunSystemCall(
            'CheckForRandomEvent',
            { caller_crew: { id: selectedCrew.id, label: selectedCrew.label }},
            process.env.REACT_APP_STARKNET_DISPATCHER
          )
        )
        .then((response) => {
          const pendingEvent = response?.result?.[1] ? parseInt(response?.result?.[1]) : null;
          if (pendingEvent > 0) {
            getBlockTime(starknet, selectedCrew.Crew.actionRound + RandomEvent.MIN_ROUNDS).then((timestamp) => {
              setActionTypeTriggered({
                actionType: selectedCrew.Crew.actionType,
                pendingEvent,
                timestamp
              });
            })
          }
        })
        .catch((err) => {
          console.warn('CheckForRandomEvent', err);
          // (wasTriggered can stay false)
        });
      }
    }
  }, [selectedCrew?.Crew?.actionType, selectedCrew?.Crew?.actionRound, blockNumber]);

  // add final data to selected crew
  const finalSelectedCrew = useMemo(() => {
    if (!selectedCrew) return null;
    return {
      ...selectedCrew,
      _actionTypeTriggered: actionTypeTriggered,
      _station: selectedCrewLocation?.Station || {},
      _timeAcceleration: parseInt(TIME_ACCELERATION) // (attach to crew for easy use in bonus calcs)
    }
  // (launched and ready are required for some reason to get final to update)
  }, [actionTypeTriggered, selectedCrew, selectedCrew?._launched, selectedCrew?._ready, selectedCrewLocation, TIME_ACCELERATION]);

  // return all pending transactions that are specific to this crew AND those that are not specific to any crew
  const pendingTransactions = useMemo(() => {
    if (!selectedCrew?.id) return [];
    return (allPendingTransactions || []).filter((tx) => !tx.vars?.caller_crew?.id || (tx.vars.caller_crew.id === selectedCrew.id));
  }, [allPendingTransactions, selectedCrew?.id])

  const refreshReadyAt = useCallback(async () => {
    const updatedCrew = await api.getEntityById({ label: Entity.IDS.CREW, id: selectedCrewId, components: ['Crew'] });
    if (updatedCrew) {
      queryClient.setQueryData(ownedCrewsQueryKey, (prevRawCrews = []) => {
        return prevRawCrews.map((c) => {
          if (c.id === updatedCrew.id) {
            // TODO: any reason not to just replace the whole Crew component here?
            c.Crew.actionRound = updatedCrew.Crew.actionRound;
            c.Crew.actionStrategy = updatedCrew.Crew.actionStrategy;
            c.Crew.actionType = updatedCrew.Crew.actionType;
            c.Crew.actionWeight = updatedCrew.Crew.actionWeight;
            c.Crew.lastFed = updatedCrew.Crew.lastFed;
            c.Crew.readyAt = updatedCrew.Crew.readyAt;
          }
          return c;
        });
      });
    }
  }, [selectedCrewId]);

  // make sure a default-selected crew makes it into state (if logged in)
  useEffect(() => {
    if (account && crewsAndCrewmatesReady && selectedCrew?.id !== selectedCrew) {
      dispatchCrewSelected(selectedCrew?.id || undefined);
    }
  }, [account, crewsAndCrewmatesReady, selectedCrew]);

  const captain = useMemo(() => selectedCrew?._crewmates?.[0] || null, [crewmateMap, selectedCrew]);

  const crewCan = useCallback(
    (permission, hydratedTarget) => (finalSelectedCrew && hydratedTarget)
      ? Permission.isPermitted(finalSelectedCrew, permission, hydratedTarget)
      : false,
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
      pendingTransactions,
      refreshReadyAt,
      selectCrew: dispatchCrewSelected  // TODO: this might be redundant
    }}>
      {children}
    </CrewContext.Provider>
  );
};

export default CrewContext;
