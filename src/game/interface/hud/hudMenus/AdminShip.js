import { useMemo } from 'react';
import { Entity } from '@influenceth/sdk';

import useLot from '~/hooks/useLot';
import useShip from '~/hooks/useShip';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import EntityNameForm from './components/EntityNameForm';
import ShipTitleArea from './components/ShipTitleArea';
import EntityDescriptionForm from './components/EntityDescriptionForm';

const AdminShip = ({}) => {
  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const zoomShipId = zoomScene?.type === 'SHIP' ? zoomScene.shipId : null;
  const { data: zoomShip } = useShip(zoomShipId);
  const { data: lot } = useLot(lotId);

  const ship = useMemo(() => zoomShipId ? zoomShip : lot?.surfaceShip, [lot, zoomShip, zoomShipId]);

  return (
    <>
      <Scrollable>
        <ShipTitleArea ship={ship} />

        <HudMenuCollapsibleSection titleText="Update Name" collapsed>
          <EntityNameForm
            entity={ship ? { id: ship.id, label: Entity.IDS.SHIP } : null}
            originalName={ship?.Name?.name}
            label="Ship Name" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Description" collapsed>
          <EntityDescriptionForm
            entity={ship ? { id: ship.id, label: Entity.IDS.SHIP } : null}
            originalDesc={``}
            label="Ship Description" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Permissions" collapsed>
          {/* TODO ... */}
        </HudMenuCollapsibleSection>
      </Scrollable>
    </>
  );
};

export default AdminShip;
