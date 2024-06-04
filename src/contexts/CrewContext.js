import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Crewmate, Entity, Permission, RandomEvent, System } from '@influenceth/sdk';

import api from '~/lib/api';
import useSession from '~/hooks/useSession';
import useConstants from '~/hooks/useConstants';
import useEntity from '~/hooks/useEntity';
import useStore from '~/hooks/useStore';
import { earlyAccessJSTime, getBlockTime, getCrewAbilityBonuses, locationsArrToObj, openAccessJSTime } from '~/lib/utils';
import { entitiesCacheKey } from '~/lib/cacheKey';

const CrewContext = createContext();

export function CrewProvider({ children }) {
  const { accountAddress, authenticated, blockNumber, blockTime, provider, token } = useSession();

  const queryClient = useQueryClient();
  const allPendingTransactions = useStore(s => s.pendingTransactions);
  const selectedCrewId = useStore(s => s.selectedCrewId);
  const dispatchCrewSelected = useStore(s => s.dispatchCrewSelected);

  const { data: constants, isLoading: constantsLoading } = useConstants(['CREW_SCHEDULE_BUFFER','TIME_ACCELERATION']);
  const [CREW_SCHEDULE_BUFFER, TIME_ACCELERATION] = useMemo(() => {
    if (!constants) return [];
    return [constants.CREW_SCHEDULE_BUFFER, constants.TIME_ACCELERATION];
  }, [constants]);

  const ownedCrewsQueryKey = useMemo(
    () => entitiesCacheKey(Entity.IDS.CREW, { owner: accountAddress }),
    [accountAddress]
  );

  const { data: rawCrews, isLoading: crewsLoading, dataUpdatedAt: rawCrewsUpdatedAt } = useQuery(
    ownedCrewsQueryKey,
    () => api.getOwnedCrews(accountAddress),
    { enabled: !!token }
  );

  const combinedCrewRoster = useMemo(
    () => (rawCrews || []).reduce((acc, c) => [...acc, ...c.Crew.roster], []),
    [rawCrews, rawCrewsUpdatedAt]
  );
  const { data: myCrewCrewmates, isLoading: crewmatesLoading } = useQuery(
    entitiesCacheKey(Entity.IDS.CREWMATE, combinedCrewRoster.join(',')), // TODO: joined key
    () => api.getCrewmates(combinedCrewRoster),
    { enabled: combinedCrewRoster?.length > 0 }
  );

  const { data: myOwnedCrewmates, isLoading: myOwnedCrewmatesLoading } = useQuery(
    entitiesCacheKey(Entity.IDS.CREWMATE, { owner: accountAddress }),
    () => api.getAccountCrewmates(accountAddress),
    { enabled: !!token }
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

        // TODO: should all `notFurtherModified` bonuses be calculated just once here (instead of everywhere else)

        const foodBonuses = getCrewAbilityBonuses([Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME, Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY], c);
        c._foodBonuses = {
          consumption: foodBonuses[Crewmate.ABILITY_IDS.FOOD_CONSUMPTION_TIME]?.totalBonus,
          rationing: foodBonuses[Crewmate.ABILITY_IDS.FOOD_RATIONING_PENALTY]?.totalBonus
        };

        const invBonuses = getCrewAbilityBonuses([Crewmate.ABILITY_IDS.INVENTORY_MASS_CAPACITY, Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY], c);
        c._inventoryBonuses = {
          mass: invBonuses[Crewmate.ABILITY_IDS.INVENTORY_MASS_CAPACITY]?.totalBonus,
          volume: invBonuses[Crewmate.ABILITY_IDS.INVENTORY_VOLUME_CAPACITY]?.totalBonus,
        };
      }
      if (c.Location?.locations) {
        c._location = locationsArrToObj(c.Location.locations);
      }
      if (c.Crew) {
        c._ready = blockTime >= c.Crew.readyAt;
        c._readyToSequence = blockTime + CREW_SCHEDULE_BUFFER >= c.Crew.readyAt;
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

        // overwrite food so 100% until launch
        if (c.Crew) {
          try { // sometimes this is reported as a read-only property?
            c.Crew.lastFed = Math.max(Math.min(blockTime, openAccessJSTime / 1e3), c.Crew.lastFed);
          } catch (e) {
            console.warn('lastFed overwrite failed. refresh the page.', e);
          }
        }
      } else {
        c._launched = true;
        c._launched = blockTime > earlyAccessJSTime / 1e3;
      }
      // ^^^

      return c;
    })
  }, [blockTime, rawCrews, rawCrewsUpdatedAt, crewmateMap, crewsAndCrewmatesReady, CREW_SCHEDULE_BUFFER]);

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
      // TODO: actionRound tmp fix
      if (selectedCrew?.Crew?.actionType && selectedCrew.Crew.actionRound) {// && (selectedCrew.Crew.actionRound + RandomEvent.MIN_ROUNDS) <= blockNumber) {
        provider.callContract(
          System.getRunSystemCall(
            'CheckForRandomEvent',
            { caller_crew: { id: selectedCrew.id, label: selectedCrew.label }},
            process.env.REACT_APP_STARKNET_DISPATCHER
          )
        )
        .then((response) => {
          const pendingEvent = response ? parseInt(response[1]) : null;
          if (pendingEvent > 0) {
            // TODO: actionRound tmp fix
            // getBlockTime(provider, selectedCrew.Crew.actionRound + RandomEvent.MIN_ROUNDS).then((timestamp) => {
            //   console.log('SET TRIGGER', {
            //     actionType: selectedCrew.Crew.actionType,
            //     pendingEvent,
            //     timestamp,
            //     _now: Math.floor(Date.now() / 1000)
            //   });
            //   setActionTypeTriggered({
            //     actionType: selectedCrew.Crew.actionType,
            //     pendingEvent,
            //     timestamp
            //   });
            // })
            setActionTypeTriggered({
              actionType: selectedCrew.Crew.actionType,
              pendingEvent,
              timestamp: Math.floor(Date.now() / 1000)
            });
          }
        })
        .catch((err) => {
          console.warn('CheckForRandomEvent', err);
          // (wasTriggered can stay false)
        });
      }
    }
  }, [actionTypeTriggered, selectedCrew?.Crew?.actionType, selectedCrew?.Crew?.actionRound, blockNumber, provider]);

  // add final data to selected crew
  const finalSelectedCrew = useMemo(() => {
    if (!selectedCrew) return null;
    return {
      ...selectedCrew,
      _actionTypeTriggered: actionTypeTriggered,
      _ready: selectedCrew?._ready && !actionTypeTriggered,
      _station: selectedCrewLocation?.Station || {},
      _scheduleBuffer: parseInt(CREW_SCHEDULE_BUFFER),
      _timeAcceleration: parseInt(TIME_ACCELERATION) // (attach to crew for easy use in bonus calcs)
    }
  // (launched and ready are required for some reason to get final to update)
  }, [actionTypeTriggered, selectedCrew, selectedCrew?._launched, selectedCrew?._ready, selectedCrewLocation, CREW_SCHEDULE_BUFFER, TIME_ACCELERATION]);

  // return all pending transactions that are specific to this crew AND those that are not specific to any crew
  const pendingTransactions = useMemo(() => {
    if (!selectedCrew?.id) {
      return (allPendingTransactions || []).filter((tx) => !tx.vars?.caller_crew?.id);
    }
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

            // since refreshReadyAt can only happen on selectedCrewId, untrigger random event
            // (in case random event resolution is what brought us here)
            setActionTypeTriggered(false);
          }
          return c;
        });
      });
    }
  }, [ownedCrewsQueryKey, selectedCrewId]);

  // make sure a default-selected crew makes it into state (if logged in)
  useEffect(() => {
    if (authenticated && crewsAndCrewmatesReady && selectedCrew?.id !== selectedCrew) {
      dispatchCrewSelected(selectedCrew?.id || undefined);
    }
  }, [authenticated, crewsAndCrewmatesReady, selectedCrew]);

  const captain = useMemo(() => selectedCrew?._crewmates?.[0] || null, [crewmateMap, selectedCrew]);

  const crewCan = useCallback(
    (permission, hydratedTarget) => (finalSelectedCrew && hydratedTarget)
      ? Permission.isPermitted(finalSelectedCrew, permission, hydratedTarget)
      : false,
    [finalSelectedCrew]
  );

  const lastBlockNumber = useRef(blockNumber);
  const blockHasBeenMissed = useRef();
  useEffect(() => {
    if (lastBlockNumber.current > 0 && blockNumber > (lastBlockNumber.current + 1)) {
      blockHasBeenMissed.current = true;
      console.warn(`block(s) missed between ${lastBlockNumber.current} and ${blockNumber}`);
    }
    lastBlockNumber.current = blockNumber;
  }, [blockNumber]);

  const isBlurred = useRef(false);
  const onBlur = useCallback(() => {
    isBlurred.current = true;
  }, []);

  // if window was unfocused for long enough to miss a block, when it refocuses...
  // reload the page
  // TODO: could try just clearing the cache and making sure caught up on blocks)
  //       i.e. blockHasBeenMissed.current = false; initializeBlockData().then(() => { queryClient.clear(); });
  // TODO: could potentially miss still have missed websocket info for a short enough window
  //       that didn't miss a block...
  // TODO: could they potentially miss a block without blurring? in that case, we would
  //       probably also want to reload
  // TODO: when first create crew, should probably reload all queries since they were not being updated
  //       in the time before crew creation
  const onFocus = useCallback(() => {
    if (isBlurred.current) {
      isBlurred.current = false;

      // reload if explicitly missed a block and window has returned to focus
      if (blockHasBeenMissed.current) {
        window.location.reload();
      }
    }
  }, [blockTime]);

  useEffect(() => {
    if (!!finalSelectedCrew) {
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
      return () => {
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
      }
    }
  }, [!!finalSelectedCrew, onBlur, onFocus]);

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
