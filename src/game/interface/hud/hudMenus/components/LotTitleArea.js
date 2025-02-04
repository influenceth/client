import { useMemo } from 'react';
import styled from 'styled-components';
import { Building, Lot } from '@influenceth/sdk';

import { LocationIcon, WarningIcon } from '~/components/Icons';
import formatters from '~/lib/formatters';
import EntityName from '~/components/EntityName';
import TitleArea from '../components/TitleArea';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';

const SubtitleRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const Abandoned = styled.div`
  color: ${p => p.theme.colors.error};
`;

const LotTitleArea = ({ lot }) => {
  const [title, subtitle, background] = useMemo(() => {
    if (!lot) return [];
    if (lot.building) {
      if (lot.building.Building?.status < Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
        return [
          `${Building.TYPES[lot.building.Building?.buildingType].name} Site`,
          lot.building.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION ? 'Construction Site' : 'Planned Construction',
          `BuildingSite_${lot.building.Building?.buildingType}`
        ]
      }
      return [
        formatters.buildingName(lot.building),
        Building.TYPES[lot.building.Building.buildingType].name,
        `Building_${lot.building.Building.buildingType}`
      ];
    } else if (lot?.surfaceShip) {
      return [
        formatters.shipName(lot.surfaceShip),
        `Landing Site (Empty Lot)`,
        'SurfaceShip'
      ];
    }
    return ['Empty Lot', null, 'EmptyLot'];
  }, [lot]);

  return (
    <TitleArea
      background={background}
      title={title}
      subtitle={subtitle}
      upperLeft={lot && (
        <>
          <LocationIcon />
          <span style={{ marginRight: 4, opacity: 0.55 }}><EntityName {...lot.Location.location} /> {'>'}</span>
          {formatters.lotName(Lot.toIndex(lot.id))}
        </>
      )}
    />
  );
}

export default LotTitleArea;