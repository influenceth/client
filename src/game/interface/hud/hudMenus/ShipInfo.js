import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Entity, Inventory, Lot, Ship } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, majorBorderColor, Rule, Scrollable, Tray } from './components/components';
import ClipCorner from '~/components/ClipCorner';
import { BackIcon, LocationIcon, MagnifyingIcon, SurfaceTransferIcon } from '~/components/Icons';
import useLot from '~/hooks/useLot';
import ResourceRequirement from '~/components/ResourceRequirement';
import { getBuildingRequirements } from '../actionDialogs/components';
import { getBuildingIcon } from '~/lib/assetUtils';
import useDeliveryManager from '~/hooks/actionManagers/useDeliveryManager';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import TitleArea from './components/TitleArea';
import formatters from '~/lib/formatters';
import EntityName from '~/components/EntityName';
import moment from 'moment';
import Button from '~/components/ButtonAlt';
import { reactBool } from '~/lib/utils';
import IconButton from '~/components/IconButton';
import useShip from '~/hooks/useShip';
import ShipTitleArea from './components/ShipTitleArea';

const Description = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 14px;
  line-height: 20px;
`;

const ShipInfo = () => {
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { data: ship } = useShip(zoomScene?.type === 'SHIP' ? zoomScene?.shipId : null);

  useEffect(() => {
    if (!zoomScene?.shipId) {
      // TODO: close
    }
  }, [zoomScene?.shipId]);

  if (!ship) return null;
  return (
    <>
      <Scrollable hasTray>
        <ShipTitleArea ship={ship} />

        <HudMenuCollapsibleSection titleText="Ship Description" collapsed>
          <Description>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </Description>
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Ship Permissions">

        </HudMenuCollapsibleSection>

      </Scrollable>
    </>
  );
};

export default ShipInfo;