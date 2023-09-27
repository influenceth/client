import formatters from "~/lib/formatters";
import { CrewLocationIcon } from "./Icons";


const CrewLocationLabel = ({ hydratedLocation }) => {
  return (
    <>
      <CrewLocationIcon />
      {formatters.asteroidName(hydratedLocation.asteroid)}
      {(() => {
        const { ship, building, lotId } = hydratedLocation;
        if (ship) return <span>{formatters.shipName(ship)}</span>;
        if (building) return <span>{formatters.buildingName(building)}</span>;
        if (lotId) return <span>{formatters.lotName(lotId)}</span>;
        return null;
      })()}
    </>
  );
};

export default CrewLocationLabel;