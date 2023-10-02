import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building, Inventory, Product } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, majorBorderColor, Rule } from './components';
import ClipCorner from '~/components/ClipCorner';
import { SurfaceTransferIcon } from '~/components/Icons';
import useLot from '~/hooks/useLot';
import ResourceRequirement from '~/components/ResourceRequirement';
import { getBuildingRequirements } from '../actionDialogs/components';
import { getBuildingIcon } from '~/lib/assetUtils';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Description = styled.div`
  color: #999;
  font-size: 14px;
`;
const ExtraDescription = styled(Description)`
  label {
    border-top: 1px solid ${majorBorderColor};
    color: white;
    display: block;
    margin-bottom: 8px;
    margin-top: 12px;
    padding-top: 12px;
  }
`;

const DetailRow = styled.div`
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 90%;
  padding: 4px 0;
  width: 100%;
  & > label {
    flex: 1;
  }
  & > div {
    color: #999;
    text-align: right;
  }
`;

const Dot = styled.div`
  height: 10px;
  width: 10px;
  border-radius: 10px;
  background: #333;
  display: inline-block;
  margin-left: 2px;
`;

const BuildingRow = styled.div`
  align-items: center;
  ${p => p.selected && `background: rgba(255, 255, 255, 0.15);`}
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 5px 2px;
  width: 100%;
  & > label {
    color: white;
    flex: 1;
  }
  & > span {
    color: #999;
    ${p => p.complexity && `
      ${Dot}:nth-child(n+1):nth-child(-n+${p.complexity}) {
        background: white;
      }
    `}
  }

  &:first-child {
    label, span {
      color: #555;
    }
  }
  &:not(:first-child) {
    cursor: ${p => p.theme.cursors.active};
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

const SiteThumb = styled.div`
  background-color: black;
  background-image: url('${p => p.image}');
  background-position: center center;
  background-repeat: no-repeat;
  background-size: contain;
  border: 1px solid #333;
  ${p => p.theme.clipCorner(10)};
  height: 136px;
  position: relative;
  width: 240px;
  &:before {
    content: 'Site Plan';
    color: ${p => p.theme.colors.main};
    display: block;
    font-size: 14px;
    margin: 8px 0 0 8px;
  }
`;

const Requirements = styled.div`
  label {
    color: white;
    display: block;
    font-size: 14px;
    margin-top: 12px;
    margin-bottom: 8px;
  }
`;

const ItemsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  & > div {
    flex-shrink: 0;
    margin-right: 6px;
    &:last-child {
      margin-right: 0;
    }
  }
`;

const ConstructionPlan = ({ buildingType, planningLot }) => {
  const thumbUrl = getBuildingIcon(buildingType, 'w400', true);

  const items = useMemo(
    () => {
      const requirements = getBuildingRequirements(planningLot);
      return requirements.map((item) => ({
        i: item.i,
        numerator: item.inInventory + item.inTransit,
        denominator: item.totalRequired,
        customIcon: item.inTransit > 0
          ? {
            animated: true,
            icon: <SurfaceTransferIcon />
          }
          : undefined
      }));
    },
    [planningLot]
  );

  return (
    <>
      <SiteThumb image={thumbUrl}>
        <ClipCorner color="#333" dimension={10} />
      </SiteThumb>
      <Requirements>
        <label>Required Materials</label>
        <ItemsList>
          {items.map((item) => (
            <ResourceRequirement
              key={item.i}
              isGathering={!!planningLot}
              noStyles={!planningLot}
              item={item}
              resource={Product.TYPES[item.i]}
              size="85px"
              tooltipContainer="hudMenu" />
          ))}
        </ItemsList>
      </Requirements>
    </>
  );
  return null;
};

const LotInfo = () => {
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const { data: lot, isLoading } = useLot(asteroidId, lotId);

  const [selectedBuilding, setSelectedBuilding] = useState();

  const mainInventoryType = useMemo(() => (lot?.building?.Inventories || []).find((l) => l.status === Inventory.STATUSES.AVAILABLE)?.inventoryType, [lot]);
  const inventoryConfig = Inventory.getType(mainInventoryType) || {}; // TODO: use Inventory.getFilledCapacity() instead?

  if (!lot) return null;
  if (lot && !lot.building) {
    return (
      <Wrapper>
        <HudMenuCollapsibleSection titleText={Building.TYPES[0].name}>
          <Description>{Building.TYPES[0].description}</Description>
          <ExtraDescription>
            <label>Building Sites</label>
            <div>Sites are active for 24 hours to allow building materials to be transferred.</div>
          </ExtraDescription>
        </HudMenuCollapsibleSection>
        
        <HudMenuCollapsibleSection titleText="Buildings Overview" borderless>
          <BuildingRow>
            <label>Name</label>
            <span>Complexity</span>
          </BuildingRow>
          {Object.keys(Building.TYPES).map((buildingType) => {
            if (buildingType === 0) return null;
            const name = Building.TYPES[buildingType].name;
            return (
              <BuildingRow
                key={buildingType}
                complexity={
                  (buildingType > 0 ? 1 : 0)
                  + (buildingType > 2 ? 1 : 0)
                  + (buildingType > 5 ? 1 : 0)
                  + (buildingType > 7 ? 1 : 0)
                  + (buildingType > 8 ? 1 : 0)
                }
                onClick={() => setSelectedBuilding(buildingType)}
                selected={selectedBuilding === buildingType}>
                <label>{name}</label>
                <span>
                  <Dot />
                  <Dot />
                  <Dot />
                  <Dot />
                  <Dot />
                </span>
              </BuildingRow>
            );
          })}
          {selectedBuilding && (
            <div style={{ marginTop: 15 }}>
              <ConstructionPlan buildingType={selectedBuilding} />
            </div>
          )}
        </HudMenuCollapsibleSection>
      </Wrapper>
    );
  }
  return (
    <Wrapper>
      <HudMenuCollapsibleSection titleText={Building.TYPES[lot.building?.Building?.buildingType]?.name}>
        {lot && !isLoading && (
          <>
            <Description>{Building.TYPES[lot.building?.Building?.buildingType].description}</Description>
            {lot.building?.Building?.buildingType === Building.IDS.WAREHOUSE && (
              <>
                <Rule margin="15px" />
                {inventoryConfig.volumeConstraint && (
                  <DetailRow>
                    <label>Maximum Storage Volume</label>
                    <div>{inventoryConfig.volumeConstraint} mL (TODO: m<sup>3</sup>)</div>
                  </DetailRow>
                )}
                {inventoryConfig.volumeConstraint && (
                  <DetailRow>
                    <label>Maximum Storage Mass</label>
                    <div>{inventoryConfig.massConstraint} g (TODO: t)</div>
                  </DetailRow>
                )}
              </>
            )}

            {lot.building?.Building?.buildingType === Building.IDS.MARKETPLACE && (
              <>
                {/* TODO: real stats */}
                <Rule margin="15px" />
                <DetailRow>
                  <label>Weekly Volume</label>
                  <div>1.5m SWAY</div>
                </DetailRow>
                <DetailRow>
                  <label>Open Orders</label>
                  <div>13,429</div>
                </DetailRow>
                <DetailRow>
                  <label>Open For</label>
                  <div>43,429 ADAYS</div>
                </DetailRow>
                <DetailRow>
                  <label>Tax Rate</label>
                  <div>0.5%</div>
                </DetailRow>
              </>
            )}
          </>
        )}
      </HudMenuCollapsibleSection>

      <HudMenuCollapsibleSection
        titleText="Construction"
        collapsed={lot.building.Building.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL}
        borderless>
        <ConstructionPlan
          buildingType={lot.building.Building.buildingType}
          planningLot={lot.building.Building.status === Building.CONSTRUCTION_STATUSES.PLANNED ? lot : null} />
      </HudMenuCollapsibleSection>
    </Wrapper>
  );
};

export default LotInfo;