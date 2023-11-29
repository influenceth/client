import formatters from '~/lib/formatters';
import { CrewLocationIcon } from './Icons';

const CrewLocationLabel = ({ hydratedLocation }) => {
  return (
    <>
      <CrewLocationIcon />
      {' '}{formatters.asteroidName(hydratedLocation.asteroid)}
      {(() => {
        const { ship, building, lotIndex } = hydratedLocation;
        if (ship) return <span>{formatters.shipName(ship)}</span>;
        if (building) return <span>{formatters.buildingName(building)}</span>;
        if (lotIndex) return <span>{formatters.lotName(lotIndex)}</span>;
        return null;
      })()}
    </>
  );
};

export default CrewLocationLabel;