import { Building, Entity } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import EntityNameForm from './components/EntityNameForm';
import LotTitleArea from './components/LotTitleArea';
import MarketplaceSettings from './components/MarketplaceSettings';
import PolicyPanels from './components/PolicyPanels';
import EntityDescriptionForm from './components/EntityDescriptionForm';
import SwitchToAdministratingCrew from './components/SwitchToAdministratingCrew';

const AdminBuilding = ({}) => {
  const lotId = useStore(s => s.asteroids.lot);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  return (
    <>
      <Scrollable>
        <LotTitleArea lot={lot} />

        {crew?.id !== lot?.building?.Control?.controller?.id && (
          <SwitchToAdministratingCrew entity={lot?.building} />
        )}

        {crew?.id && crew.id === lot?.building?.Control?.controller?.id && (
          <>
            <HudMenuCollapsibleSection titleText="Update Name" collapsed>
              <EntityNameForm
                entity={lot.building}
                originalName={lot.building.Name?.name}
                label="Building Name"
                skipCollisionCheck={false} />
            </HudMenuCollapsibleSection>

            <HudMenuCollapsibleSection titleText="Update Description" collapsed>
              <EntityDescriptionForm
                entity={{ id: lot.building.id, label: Entity.IDS.BUILDING }}
                originalDesc={``}
                label="Building Description" />
            </HudMenuCollapsibleSection>

            <HudMenuCollapsibleSection titleText="Update Permissions" collapsed>
              <PolicyPanels editable entity={lot.building} />
            </HudMenuCollapsibleSection>

            {lot?.building?.Building?.buildingType === Building.IDS.MARKETPLACE && (
              <HudMenuCollapsibleSection titleText="Marketplace Settings">
                <MarketplaceSettings marketplace={lot.building} />
              </HudMenuCollapsibleSection>
            )}
          </>
        )}
      </Scrollable>
    </>
  );
};

export default AdminBuilding;
