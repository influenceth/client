import styled from 'styled-components';
import { Ship } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import useShip from '~/hooks/useShip';
import ShipTitleArea from './components/ShipTitleArea';
import PolicyPanels from './components/PolicyPanels';

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 14px;
  line-height: 20px;
`;

const ShipInfo = () => {
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: ship } = useShip(zoomScene?.type === 'SHIP' ? zoomScene?.shipId : null);

  if (!ship) return null;
  return (
    <>
      <Scrollable hasTray>
        <ShipTitleArea ship={ship} />

        <HudMenuCollapsibleSection titleText="Ship Description">
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