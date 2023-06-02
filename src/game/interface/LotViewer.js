import { Construction } from '@influenceth/sdk';
import useLot from "~/hooks/useLot";
import useStore from "~/hooks/useStore";
import ModelViewer from "./ModelViewer";

const LotViewer = () => {
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const zoomToLot = useStore(s => s.asteroids.zoomToLot);

  const { data, isLoading } = useLot(asteroidId, lotId);

  if (!zoomToLot || isLoading) return null;

  const building = data?.building?.construction?.status === Construction.STATUS_OPERATIONAL
    ? data.building.__t
    : 'Empty Lot';
  return (
    <ModelViewer assetType="Building" inGameMode={building} />
  );
}

export default LotViewer;
        