import { useCallback, useContext, useMemo } from 'react';
import { Asteroid } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useCrewContext from '~/hooks/useCrewContext';

const useScanManager = (asteroid) => {
  const { readyItems, liveBlockTime } = useActionItems();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();

  const { scanType, startSystem, finishSystem, payload } = useMemo(() => {
    const scanType = asteroid?.Celestial?.scanStatus < Asteroid.SCAN_STATUSES.SURFACE_SCANNED ? 'SURFACE' : 'RESOURCE';
    const startSystem = scanType === 'RESOURCE' ? 'ScanResourcesStart' : (asteroid?.AsteroidProof?.used ? 'ScanSurfaceStart' : 'InitializeAndStartSurfaceScan');
    return {
      scanType,
      startSystem,
      finishSystem: scanType === 'RESOURCE' ? 'ScanResourcesFinish' : 'ScanSurfaceFinish',
      payload: asteroid && crew && {
        asteroid: startSystem === 'InitializeAndStartSurfaceScan' ? asteroid : { id: asteroid.id, label: asteroid.label },
        caller_crew: { id: crew.id, label: crew.label }
      }
    };
  }, [asteroid, crew]);

  const scanStatus = useMemo(() => {
    if (asteroid?.Celestial) {
      if (scanType === 'SURFACE' && asteroid.Celestial?.scanStatus === Asteroid.SCAN_STATUSES.SURFACE_SCANNED) {
        return 'FINISHED';
      } else if (scanType === 'RESOURCE' && asteroid.Celestial?.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED) {
        return 'FINISHED';
      } else if (asteroid.Celestial.scanFinishTime > 0) {
        if(getStatus(finishSystem, payload) === 'pending') {
          return 'FINISHING';
        } else if (asteroid.Celestial.scanFinishTime <= liveBlockTime) {
          return 'READY_TO_FINISH';
        }
        return 'SCANNING';
      } else if (getStatus(startSystem, payload) === 'pending') {
        return 'SCANNING';
      }
    }
    return 'UNSCANNED';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from UNDER_CONSTRUCTION to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ asteroid, getStatus, startSystem, finishSystem, payload, readyItems, scanType ]);

  const startAsteroidScan = useCallback(
    () => execute(startSystem, payload),
    [execute, startSystem, payload]
  );

  const finalizeAsteroidScan = useCallback(
    () => execute(finishSystem, payload),
    [execute, finishSystem, payload]
  );

  return {
    startAsteroidScan,
    finalizeAsteroidScan,
    scanStatus,
    scanType
  };
};

export default useScanManager;
