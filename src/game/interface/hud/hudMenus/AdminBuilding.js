import { useMemo } from 'react';
import { Building } from '@influenceth/sdk';
// import styled from 'styled-components';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import MarketplaceSettings from './components/MarketplaceSettings';
import { HudMenuCollapsibleSection, Scrollable } from './components';

const AdminBuilding = ({}) => {
  const lotId = useStore(s => s.asteroids.lot);

  const { data: lot } = useLot(lotId);

  return (
    <>
      <Scrollable>
        <HudMenuCollapsibleSection titleText="Building Name" collapsed>
          {/* TODO ... */}
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Building Description" collapsed>
          {/* TODO ... */}
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Building Permissions" collapsed>
          {/* TODO ... */}
        </HudMenuCollapsibleSection>

        {lot?.building?.Building?.buildingType === Building.IDS.MARKETPLACE && (
          <HudMenuCollapsibleSection titleText="Marketplace Settings">
            <MarketplaceSettings marketplace={lot?.building} />
          </HudMenuCollapsibleSection>
        )}
      </Scrollable>
    </>
  );
};

export default AdminBuilding;
