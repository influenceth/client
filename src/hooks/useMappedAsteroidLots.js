import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';

import api from '~/lib/api';
import { options as lotLeaseOptions } from '~/components/filters/LotLeaseFilter';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import useAsteroidCrewSamples from './useAsteroidCrewSamples';
import useAsteroidCrewLots from './useAsteroidCrewLots';

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
  const { data: lotData, isLoading: lotDataLoading } = useQuery(
    [ 'asteroidLots', i ],
    () => api.getAsteroidLotData(i),
    { enabled: !!i }
  );

  // get all sampled lots (for this resource) from the server
  const { data: sampledLots, isLoading: sampledLotsLoading } = useAsteroidCrewSamples(i, mapResourceId);
  const [lotSampledMap, fillTally] = useMemo(() => {
    return [
      sampledLots
        ? sampledLots.reduce((acc, i) => { acc[i] = true; return acc; }, {})
        : (sampledLotsLoading ? {} : null),
      sampledLots?.length || 0
    ];
  }, [sampledLots]);

  // get all occupied-by-me lots from the server
  const { data: crewLots, isLoading: crewLotsLoading } = useAsteroidCrewLots(i);
  const myOccupationMap = useMemo(() => {
    if (crewLotsLoading) return null;
    return (crewLots || []).reduce((acc, p) => { acc[p.i] = true; return acc; }, {});
  }, [crewLots, crewLotsLoading]);

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
      if (filters.type && !filters.type.includes(unpacked.type.toString())) return false;
      if (filters.leasability && filters.leasability !== unpacked.leaseStatus) return false;
      if (filters.occupiedBy && filters.occupiedBy !== unpacked.occupiedBy) return false;
      if (filters.hasCrew && !unpacked.crewPresent) return false;
      if (filters.hasCoresForSale && !unpacked.coresPresent) return false;
      return true;
    } else {
      return unpacked.type > 0;
    }
  }, [mappedLotSearch?.filters, searchIsOn]);
  
  // build sparse array of search results
  // TODO (enhancement): should send this to a worker if possible
  const [lotDisplayMap, buildingTally, resultTally] = useMemo(() => {
    const results = [];

    let unpacked = {};
    let isResult = false;
    let hasBuilding = false;
    let color = false;

    let buildingTally = 0;
    let resultTally = 0;

    if (lotData && myOccupationMap) {

      // packed data has the following masks:
      //  11110000 capable type
      //  00001100 lease status (0 unleasable, 1 leasable, 2 leased)
      //  00000010 has crew present
      //  00000001 has samples for sale present
      for (let i = 1; i < lotData.length; i++) {

        // unpack this lot data
        unpacked.type = lotData[i] >> 4;
        unpacked.leasability = lotLeaseOptionKeys[(12 & lotData[i]) >> 2];
        unpacked.crewPresent = (2 & lotData[i]) >> 1;
        unpacked.coresPresent = (1 & lotData[i]);
        unpacked.occupiedBy = unpacked.type === 0
          ? 'unoccupied'
          : (
            myOccupationMap[i]
              ? 'me'
              : 'other'
          );

        // determine if this lot should be "bright"
        isResult = 0;
        if (isFilterMatch(unpacked)) {
          isResult = 1;
          resultTally++;
        }

        // determine if this lot should be outlined
        hasBuilding = 0;
        if (unpacked.type > 0) {
          hasBuilding = 1;
          buildingTally++;
        }
        
        // if this lot has something, include in the results
        if (isResult || hasBuilding) {

          // (if including, also calculate the color)
          if (highlightConfig) {    // custom highlight colors
            color = highlightValueMap[unpacked[highlightConfig.field]];
          } else if (searchIsOn) {  // (default in search mode) 0 magenta
            color = 0;
          } else {                  // (default in non-search mode) 0 blue, 1 white
            color = myOccupationMap[i] ? 1 : 0;
          }

          // pack into sparse results array
          // TODO (maybe): could fit this in Uint8Array if that was preferred
          results[i] =
            (isResult << 5)       // 100000
            + (hasBuilding << 4)  // 010000
            + color;              // 001111;

          // console.log(i + 1, { isResult, hasBuilding, color });
        }
      }
    }

    // console.log('results', results);

    return [results, buildingTally, resultTally];
  }, [lotData, myOccupationMap, isFilterMatch, highlightValueMap, rebuildTally]);

  const refetch = useCallback(() => {
    setRebuildTally((t) => t + 1);
  }, [])

  const processEvent = useCallback((eventType, body) => {
    // TODO: these events could/should technically go through the same invalidation process as primary events
    //  (it's just that these events won't match as much data b/c most may not be relevant to my crew)
    switch (eventType) {
      case 'Dispatcher_ConstructionPlan':
      case 'Dispatcher_ConstructionUnplan':
        // asteroidId, lotId, crewId, (capableType)
        queryClient.setQueryData([ 'asteroidLots', body.returnValues.asteroidId ], (currentLotsValue) => {
          currentLotsValue[body.returnValues.lotId] = 
            (currentLotsValue[body.returnValues.lotId] & 0b00001111)  // clear existing building
            | (body.returnValues.capableType || 0) << 4               // set to event building (if there is one)
          return currentLotsValue;
        });
        break;
    }
  }, []);

  const isLoading = lotDataLoading || sampledLotsLoading || crewLotsLoading;

  return useMemo(() => {
    // console.log('re memoize -- make sure this is not happening more than expected');
    return {
      data: {
        buildingTally,
        fillTally,
        resultTally,
        colorMap: highlightColorMap,
        lotDisplayMap,
        lotSampledMap,
        lastLotUpdate: Date.now()
      },
      isLoading,
      processEvent,
      refetch
    };
  }, [
    buildingTally,
    fillTally,
    resultTally,
    highlightColorMap,
    lotDisplayMap,
    lotSampledMap,
    isLoading,
    processEvent,
    refetch
  ]);
};

export default useMappedAsteroidLots;