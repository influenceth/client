import { Construction } from '@influenceth/sdk';
import usePlot from "~/hooks/usePlot";
import useStore from "~/hooks/useStore";
import ModelViewer from "./ModelViewer";

const PlotViewer = () => {
  const { asteroidId, plotId } = useStore(s => s.asteroids.plot) || {};
  const zoomToPlot = useStore(s => s.asteroids.zoomToPlot);

  const { data, isLoading } = usePlot(asteroidId, plotId);

  if (!zoomToPlot || isLoading) return null;

  const building = data?.building?.construction?.status === Construction.STATUS_OPERATIONAL
    ? data.building.__t
    : 'Empty Lot';
  return (
    <ModelViewer assetType="Building" plotZoomMode={building} />
  );
}

export default PlotViewer;
        