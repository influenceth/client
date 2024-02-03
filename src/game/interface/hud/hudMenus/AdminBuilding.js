import { Building, Entity } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import MarketplaceSettings from './components/MarketplaceSettings';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import EntityNameForm from './components/EntityNameForm';
import LotTitleArea from './components/LotTitleArea';

const AdminBuilding = ({}) => {
  const lotId = useStore(s => s.asteroids.lot);
  const { data: lot } = useLot(lotId);
  return (
    <>
      <Scrollable>
        <LotTitleArea lot={lot} />

        <HudMenuCollapsibleSection titleText="Update Name" collapsed>
          <EntityNameForm
            entity={lot?.building ? { id: lot.building.id, label: Entity.IDS.BUILDING } : null}
            originalName={lot?.building?.Name?.name}
            label="Building Name" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Description" collapsed>
          <EntityDescriptionForm
            entity={lot?.building ? { id: lot.building.id, label: Entity.IDS.BUILDING } : null}
            originalDesc={``}
            label="Building Description" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Permissions" collapsed>
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
