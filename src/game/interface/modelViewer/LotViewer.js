import { useEffect, useMemo, useState } from 'react';
import { Building } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ModelViewer from '../ModelViewer';
import { getBuildingModel, getModelUrl } from '~/lib/assetUtils';

const LotViewer = () => {
  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);
  const playSound = useStore(s => s.dispatchEffectStartRequested);

  const { data: lot, isLoading } = useLot(lotId);

  const [pendingSound, setPendingSound] = useState(null);

  // Play chatter after a delay, clear timeout if scene changes
  useEffect(() => {
    if (zoomScene?.type === 'LOT' && lot?.building?.Building?.buildingType > 0) {
      const id = setTimeout(() => playSound(`buildingChatter.${lot?.building?.Building?.buildingType}`), 5000);
      setPendingSound(id);
      return () => {
        clearTimeout(id);
        setPendingSound(null);
      }
    }
  }, [zoomScene, lot]);

  const modelUrl = useMemo(() => {
    if (zoomScene?.overrides?.buildingType) {
      return getBuildingModel(zoomScene.overrides.buildingType);
    }

    if (lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      return getBuildingModel(lot.building.Building.buildingType);
    }

    // TODO: abstract for future ship types able to land on surface
    if (lot?.surfaceShip) {
      return getModelUrl({ type: 'buildings', assetName: 'LandedLightTransport' });
    }

    return getBuildingModel(0);
  }, [lot?.building?.Building, lot?.surfaceShip, zoomScene?.overrides?.buildingType]);

  if (zoomScene?.type !== 'LOT' || isLoading) return null;
  return (
    <ModelViewer assetType="building" modelUrl={modelUrl} />
  );
}

export default LotViewer;
