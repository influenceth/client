import formatters from '~/lib/formatters';
import { LocationIcon } from './Icons';

const CrewLocationLabel = ({ hydratedLocation }) => {
  return (
    <>      
      <LocationIcon />
      {hydratedLocation.asteroid ? formatters.asteroidName(hydratedLocation.asteroid) : 'In Flight'}
      {(() => {
        const { ship, building, lotIndex } = hydratedLocation;
        if (ship) return <span>{formatters.shipName(ship)}</span>;
        if (building) return <span>{formatters.buildingName(building)}</span>;
        if (lotIndex) return <span>{formatters.lotName(lotIndex)}</span>;
        return <span>Escape Module</span>;
      })()}
    </>
  );
};

export default CrewLocationLabel;