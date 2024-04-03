import styled from 'styled-components';
import { Ship } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import useShip from '~/hooks/useShip';
import ShipTitleArea from './components/ShipTitleArea';
import PolicyPanels from './components/PolicyPanels';
import { useDescriptionAnnotation } from '~/hooks/useAnnotations';

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 14px;
  line-height: 20px;
`;

const ShipInfo = () => {
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: ship } = useShip(zoomScene?.type === 'SHIP' ? zoomScene?.shipId : null);
  const { data: annotation, isLoading: isAnnotationLoading } = useDescriptionAnnotation(ship);

  if (!ship || isAnnotationLoading) return null;
  return (
    <>
      <Scrollable hasTray>
        <ShipTitleArea ship={ship} />

        {annotation && (
          <HudMenuCollapsibleSection titleText="Description">
            <Description>
              {annotation}
            </Description>
          </HudMenuCollapsibleSection>
        )}

        <HudMenuCollapsibleSection titleText="Type Description" collapsed={!!annotation}>
          <Description>
            {Ship.TYPES[ship.Ship.shipType]?.description}
          </Description>
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Ship Permissions" collapsed>
          <PolicyPanels entity={ship} />
        </HudMenuCollapsibleSection>

      </Scrollable>
    </>
  );
};

export default ShipInfo;