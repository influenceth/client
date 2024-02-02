import { useMemo } from 'react';
import styled from 'styled-components';
import { Building, Lot } from '@influenceth/sdk';

import { LocationIcon } from '~/components/Icons';
import formatters from '~/lib/formatters';
import EntityName from '~/components/EntityName';
import TitleArea from '../components/TitleArea';

const LotTitleArea = ({ lot }) => {
  const [title, subtitle] = useMemo(() => {
    if (!lot) return [];
    if (lot.building) {
      if (lot.building.Building?.status < Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
        return [
          `${Building.TYPES[lot.building.Building?.buildingType].name} Site`,
          lot.building.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION ? 'Construction Site' : 'Planned Construction'
        ]
      }
      return [
        formatters.buildingName(lot.building),
        Building.TYPES[lot.building.Building.buildingType].name
      ];
    }
    return ['Empty Lot'];
  }, [lot]);

  return (
    <TitleArea
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