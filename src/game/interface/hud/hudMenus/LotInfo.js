import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Building, Ship } from '@influenceth/sdk';
import moment from 'moment';

import useStore from '~/hooks/useStore';
import { MagnifyingIcon } from '~/components/Icons';
import useLot from '~/hooks/useLot';
import Button from '~/components/ButtonAlt';
import { reactBool } from '~/lib/utils';
import CrewIndicator from '~/components/CrewIndicator';
import { HudMenuCollapsibleSection, Scrollable, Tray } from './components/components';
import LotTitleArea from './components/LotTitleArea';
import PolicyPanels from './components/PolicyPanels';

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 14px;
  line-height: 20px;
`;

const LotInfo = () => {
  const lotId = useStore(s => s.asteroids.lot);
  const { data: lot } = useLot(lotId);
  const { data: controller } = useLot(lot?.building?.Control?.controller?.id);

  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const gracePeriodPretty = useMemo(() => {
    return moment(Date.now() - Building.GRACE_PERIOD * 1e3).fromNow(true)
  }, []);

  const isZoomedToLot = zoomScene?.type === 'LOT';

  const toggleZoomScene = useCallback(() => {
    dispatchZoomScene(isZoomedToLot ? null : { type: 'LOT', lotId: lot?.id });
  }, [isZoomedToLot, lot?.id]);

  const siteOrBuilding = (lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL ? 'Building' : 'Site');

  if (!lot) return null;
  return (
    <>
      <Scrollable hasTray={reactBool(!isZoomedToLot)}>
        <LotTitleArea lot={lot} />

        {lot?.building && (
          <>
            <HudMenuCollapsibleSection titleText="Description">
              <Description>
                {lot.building.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
                  ? Building.TYPES[lot.building.Building.buildingType].description
                  : `
                    Construction sites are used to reserve a lot and stage materials there
                    prior to building construction. They have a limited reservation period
                    of ${gracePeriodPretty}, after which any materials already sent to the site
                    become public.
                  `}
              </Description>
            </HudMenuCollapsibleSection>

            <HudMenuCollapsibleSection titleText={`${siteOrBuilding} Permissions`} collapsed>
              <div style={{ marginBottom: 10 }}>
                <CrewIndicator crew={controller} label={`${siteOrBuilding} Controller`} />
              </div>
              <PolicyPanels entity={lot?.building} />
            </HudMenuCollapsibleSection>
          </>
        )}

        {!lot?.building && lot?.surfaceShip && (
          <>
            <HudMenuCollapsibleSection titleText="Landed Ship Description">
              <Description>
                {Ship.TYPES[lot.surfaceShip.Ship.shipType]?.description}
              </Description>
            </HudMenuCollapsibleSection>

            <HudMenuCollapsibleSection titleText="Landed Ship Permissions" collapsed>
              <PolicyPanels entity={lot?.surfaceShip} />
            </HudMenuCollapsibleSection>
          </>
        )}

        <HudMenuCollapsibleSection titleText="Lot Permissions" collapsed>
          <PolicyPanels entity={lot} />
        </HudMenuCollapsibleSection>

      </Scrollable>
    
      {!isZoomedToLot && (
        <Tray>
          <Button onClick={toggleZoomScene} subtle>
            <MagnifyingIcon style={{ marginRight: 8 }} /> Zoom to Lot
          </Button>
        </Tray>
      )}
    </>
  );
};

export default LotInfo;