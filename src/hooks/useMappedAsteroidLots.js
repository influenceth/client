import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Building, Entity, Lot } from '@influenceth/sdk';

import { options as lotLeaseOptions } from '~/components/filters/LotLeaseFilter';
import useAsteroidCrewBuildings from '~/hooks/useAsteroidCrewBuildings';
import useCrewShips from '~/hooks/useCrewShips';
import useAsteroidLotData from '~/hooks/useAsteroidLotData';
import useWalletLeasedLots from '~/hooks/useWalletLeasedLots';
import useStore from '~/hooks/useStore';
import { getAndCacheEntity } from '~/lib/activities';
import { locationsArrToObj } from '~/lib/utils';
import theme from '~/theme';

const lotLeaseOptionKeys = Object.keys(lotLeaseOptions);

const useMappedAsteroidLots = (i) => {
  const queryClient = useQueryClient();

  const isAssetSearchMatchingDefault = useStore(s => s.isAssetSearchMatchingDefault);
  const mappedLotSearch = useStore(s => s.assetSearch.lotsMapped);
  const openHudMenu = useStore(s => s.openHudMenu);
  const highlightConfig = useStore(s => s.assetSearch.lotsMapped.highlight);
  const mapResourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);

  const [rebuildTally, setRebuildTally] = useState(0);

  // get all packed lot data from server
  const { data: lotData, isLoading: lotDataLoading, dataUpdatedAt: lotDataUpdatedAt } = useAsteroidLotData(i);

  // get all leased lots from the server
  const { data: leasedLots, isLoading: leasedLotsLoading, dataUpdatedAt: dataUpdatedAt1 } = useWalletLeasedLots(i);
  const [lotLeasedMap, leasedTally] = useMemo(() => ([
    (leasedLots || []).reduce((acc, d) => ({ ...acc, [Lot.toIndex(d.id)]: true }), {}),
    leasedLots?.length || 0
  ]), [leasedLots, dataUpdatedAt1]);

  // get all occupied-by-me buildings from the server
  const { data: crewLots, isLoading: crewLotsLoading, dataUpdatedAt: dataUpdatedAt2 } = useAsteroidCrewBuildings(i);
  const myOccupationMap = useMemo(() => {
    if (crewLotsLoading) return null;
    return (crewLots || []).reduce((acc, p) => {
      const _locations = locationsArrToObj(p?.Location?.locations || []);
      return {
        ...acc,
        [_locations.lotIndex]: true
      };
    }, {});
  }, [crewLots, crewLotsLoading, dataUpdatedAt2]);

  // get all occupied-by-me ships from the server
  const { data: crewShips, isLoading: crewShipsLoading, dataUpdatedAt: dataUpdatedAt3 } = useCrewShips();
  const myShipMap = useMemo(() => {
    if (crewShipsLoading) return null;
    return (crewShips || []).reduce((acc, p) => {
      const _locations = locationsArrToObj(p?.Location?.locations || []);
      return {
        ...acc,
        [_locations.lotIndex]: true
      };
    }, {});
  }, [crewShips, crewShipsLoading, dataUpdatedAt3]);

  // determine if search is on or not
  const searchIsOn = useMemo(() => {
    return openHudMenu === 'ASTEROID_MAP_SEARCH' || !isAssetSearchMatchingDefault('lotsMapped');
  }, [openHudMenu, mappedLotSearch]);

  // init highlight config helpers
  const { highlightValueMap, highlightColorMap } = useMemo(() => {
    let colorMap;
    let valueMap = {};
    if (highlightConfig) {
      valueMap = Object.keys(highlightConfig.colorMap).reduce((acc, key, i) => {
        acc[key] = i;
        return acc;
      }, {});
      colorMap = Object.values(highlightConfig.colorMap);
    } else if (searchIsOn) {
      colorMap = { 0: '#ff00ff' };
    } else {
      colorMap = { 0: theme.colors.main, 1: '#ffffff' };
    }
    return {
      highlightColorMap: colorMap,
      highlightValueMap: valueMap
    }
  }, [highlightConfig, searchIsOn]);

  // create "search results" test function
  const isFilterMatch = useCallback((unpacked) => {
    const filters = mappedLotSearch?.filters || {};
    if (searchIsOn) {
      if (filters.category && !filters.category.includes(unpacked.category.toString())) return false;
      if (filters.leasability && filters.leasability !== unpacked.leasability) return false;
      if (filters.occupiedBy && filters.occupiedBy !== unpacked.occupiedBy) return false;
      if (filters.hasCrew && !unpacked.crewPresent) return false;
      if (filters.hasCoresForSale && !unpacked.coresPresent) return false;
      return true;
    } else {
      return unpacked.category > 0;
    }
  }, [mappedLotSearch?.filters, searchIsOn]);

  // build sparse array of search results
  // TODO (enhancement): should send this to a worker if possible
  const [lotResultMap, lotUseMap, lotColorMap, lotUseTallies, resultTally] = useMemo(() => {
    const lotResult = {};
    const lotColor = {};
    const lotUse = {};

    let unpacked = {};
    let isResult = false;
    let lotUseTallies = {};
    let resultTally = 0;

    if (lotData && myOccupationMap && myShipMap) {
      // packed data has the following masks:
      //  11110000 building category
      //  00001100 lease status (0 unleasable, 1 leasable, 2 leased)
      //  00000010 has crew present
      //  00000001 has samples for sale present
      for (let i = 1; i < lotData.length; i++) {

        // unpack this lot data
        unpacked.category = lotData[i] >> 4;
        unpacked.leasability = lotLeaseOptionKeys[(12 & lotData[i]) >> 2];
        unpacked.crewPresent = (2 & lotData[i]) >> 1;
        unpacked.coresPresent = (1 & lotData[i]);
        unpacked.occupiedBy = unpacked.category === 0
          ? 'unoccupied'
          : (
            (myOccupationMap[i] || myShipMap[i])
              ? 'me'
              : 'other'
          );

        // determine if this lot should be "bright"
        isResult = false;
        if (isFilterMatch(unpacked)) {
          isResult = true;
          resultTally++;
        }

        // determine if this lot should have an icon
        if (unpacked.category > 0) {
          lotUse[i] = unpacked.category;
          lotUseTallies[unpacked.category] = (lotUseTallies[unpacked.category] || 0) + 1;
          lotUseTallies.total = (lotUseTallies.total || 0) + 1;
        }

        // if this lot has something, include in the results
        if (isResult) {
          lotResult[i] = isResult;

          // (if including, also calculate the color)
          if (highlightConfig) {    // custom highlight colors
            lotColor[i] = highlightValueMap[unpacked[highlightConfig.field]];
          } else if (searchIsOn) {  // (default in search mode) 0 magenta
            lotColor[i] = 0;
          } else {                  // (default in non-search mode) 0 blue, 1 white
            lotColor[i] = (myOccupationMap[i] || myShipMap[i]) ? 1 : 0;
          }
        }
      }
    }

    return [lotResult, lotUse, lotColor, lotUseTallies, resultTally];
  }, [lotData, lotDataUpdatedAt, myOccupationMap, myShipMap, isFilterMatch, highlightValueMap, rebuildTally]);

  const refetch = useCallback(() => {
    setRebuildTally((t) => t + 1);
  }, [])

  const processEvent = useCallback(async (eventType, body) => {
    console.log('processEvent', eventType, body);

    let asteroidId, lotIndex, buildingType;

    // TODO: the above does not block prepopping of other activities, so any
    // getAndCacheEntity may result in double-fetches on invalidation via this event

    // construction site planned (0 -> 14)
    if (eventType === 'ConstructionPlanned') {
      asteroidId = body.event.returnValues.asteroid.id;
      lotIndex = Lot.toIndex(body.event.returnValues.lot.id);
      buildingType = 14;

    // construction site -> building (14 -> buildingType)
    } else if (eventType === 'ConstructionFinished') {
      const building = await getAndCacheEntity(body.event.returnValues.building, queryClient);
      const _location = locationsArrToObj(building?.Location?.locations || []);
      asteroidId = _location.asteroidId;
      lotIndex = _location.lotIndex;
      buildingType = Building.TYPES[building?.Building?.buildingType]?.category;; // TODO: should we cast this?

    // building -> construction site (buildingType -> 14)
    } else if (eventType === 'ConstructionDeconstructed') {
      const building = await getAndCacheEntity(body.event.returnValues.building, queryClient);
      const _location = locationsArrToObj(building?.Location?.locations || []);
      asteroidId = _location.asteroidId;
      lotIndex = _location.lotIndex;
      buildingType = 14;

    // construction site abandoned (14 -> 0)
    } else if (eventType === 'ConstructionAbandoned') {
      const building = await getAndCacheEntity(body.event.returnValues.building, queryClient);
      const _location = locationsArrToObj(building?.Location?.locations || []);
      asteroidId = _location.asteroidId;
      lotIndex = _location.lotIndex;
      buildingType = 0;

    // ship moved to empty lot (0 -> 15)
    } else if (eventType === 'ShipDocked' || eventType === 'ShipAssemblyFinished') {
      const entityId = body.event.returnValues.dock || body.event.returnValues.destination;
      if (entityId?.label === Entity.IDS.LOT) {
        const position = Lot.toPosition(entityId);
        asteroidId = position.asteroidId;
        lotIndex = position.lotIndex;
        buildingType = 15;
      }

    // ship undocked from empty lot (15 -> 0)
    } else if (eventType === 'ShipUndocked') {
      if (body.event.returnValues.dock.label === Entity.IDS.LOT) {
        const position = Lot.toPosition(body.event.returnValues.dock);
        asteroidId = position.asteroidId;
        lotIndex = position.lotIndex;
        buildingType = 0;
      }
    }

    if (asteroidId && lotIndex && buildingType !== undefined) {
      // TODO: these events could/should technically go through the same invalidation process as primary events
      //  (it's just that these events won't match as much data b/c most may not be relevant to my crew)
      queryClient.setQueryData([ 'asteroidPackedLotData', Number(asteroidId) ], (currentLotsValue) => {
        const newLotsValue = currentLotsValue.slice();
        newLotsValue[lotIndex] =
          (newLotsValue[lotIndex] & 0b00001111)  // clear existing building
          | buildingType << 4                    // set to new buildingType
        return newLotsValue;
      });
    }
  }, []);

  const isLoading = lotDataLoading || leasedLotsLoading || crewLotsLoading;

  return useMemo(() => {
    return {
      data: {
        lotUseTallies,
        leasedTally,
        resultTally,
        colorMap: highlightColorMap,
        lotResultMap,
        lotUseMap,
        lotColorMap,
        lotLeasedMap,
        lastLotUpdate: Date.now()
      },
      isLoading,
      processEvent,
      refetch
    };
  }, [
    lotUseTallies,
    leasedTally,
    resultTally,
    highlightColorMap,
    lotResultMap,
    lotUseMap,
    lotColorMap,
    lotLeasedMap,
    isLoading,
    processEvent,
    refetch
  ]);
};

export default useMappedAsteroidLots;
