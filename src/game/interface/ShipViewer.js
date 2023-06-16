import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import ModelViewer from './ModelViewer';

const ShipViewer = () => {
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: ship, isLoading } = useShip(zoomScene?.shipId);

  if (zoomScene?.type !== 'SHIP' || isLoading) return null;

  return (
    <ModelViewer assetType="Ship" inGameMode={ship?.type} />
  );
}

export default ShipViewer;
        