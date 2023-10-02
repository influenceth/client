import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Inventory, Product } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import { HudMenuCollapsibleSection } from './components';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import { CrewInputBlock, CrewLocationWrapper } from '../actionDialogs/components';
import { locationsArrToObj } from '~/lib/utils';
import { CrewLocationIcon } from '~/components/Icons';
import CrewLocationLabel from '~/components/CrewLocationLabel';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const LocationCrews = ({ locationCrews, selectedCrewId, onSelectCrew }) => {
  const hydratedLocation = useHydratedLocation(locationsArrToObj(locationCrews[0].Location.locations));
  return (
    <HudMenuCollapsibleSection
      titleText={<CrewLocationWrapper><CrewLocationLabel hydratedLocation={hydratedLocation} /></CrewLocationWrapper>}>
      {(locationCrews || []).map((crew, i) => {
        return (
          <CrewInputBlock
            key={crew.id}
            cardWidth={64}
            crew={crew}
            inlineDetails
            isSelected={crew.id === selectedCrewId}
            onClick={() => onSelectCrew(crew)}
            subtle
            style={{ marginBottom: 8, width: '100%' }} />
        );
      })}
    </HudMenuCollapsibleSection>
  );
}

const MyCrews = () => {
  const { crew, crews, loading, selectCrew } = useCrewContext();
  
  const nonEmptyCrews = useMemo(() => crews.filter((c) => c.Crew.roster.length > 0), [crews]);
  const emptyCrews = useMemo(() => crews.filter((c) => c.Crew.roster.length === 0), [crews]);

  const nonEmptyCrewsByLocation = useMemo(() => {
    const groupedCrews = nonEmptyCrews.reduce((acc, cur) => {
      const locationKey = JSON.stringify(locationsArrToObj(cur.Location.locations));
      if (!acc[locationKey]) acc[locationKey] = [];
      acc[locationKey].push(cur);
      return acc;
    }, {});
    return Object.values(groupedCrews);
  }, [nonEmptyCrews]);

  return (
    <Wrapper>
      {(nonEmptyCrewsByLocation || []).map((locationCrews, i) => (
        <LocationCrews
          key={i}
          locationCrews={locationCrews}
          selectedCrewId={crew?.id}
          onSelectCrew={(c) => selectCrew(c.id)} />
      ))}
      
      <HudMenuCollapsibleSection titleText="Empty Crews" collapsed>
        {emptyCrews.map((emptyCrew, i) => {
          return (
            <CrewInputBlock
              key={emptyCrew.id}
              cardWidth={64}
              crew={emptyCrew}
              hideCrewmates
              inlineDetails
              select
              isSelected={emptyCrew.id === crew?.id}
              onClick={() => selectCrew(emptyCrew.id)}
              subtle
              style={{ marginBottom: 8, width: '100%' }} />
          );
        })}
      </HudMenuCollapsibleSection>
    </Wrapper>
  );
};

export default MyCrews;