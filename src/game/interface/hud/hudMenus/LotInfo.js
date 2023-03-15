import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Capable, Construction, Inventory, Lot } from '@influenceth/sdk';

import { usePlotLink } from '~/components/PlotLink';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidCrewPlots from '~/hooks/useAsteroidCrewPlots';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useChainTime from '~/hooks/useChainTime';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, majorBorderColor, Rule } from './components';
import ClipCorner from '~/components/ClipCorner';
import { ConstructIcon } from '~/components/Icons';
import usePlot from '~/hooks/usePlot';
import { buildingDescriptions, buildingRecipes } from '~/lib/utils';
import ResourceRequirement from '~/components/ResourceRequirement';

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
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%
  );
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

const ConstructionPlan = ({ capableType, constructionInventory }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const thumbUrl = buildings[capableType]?.siteIconUrls?.w400;
  const ingredients = buildingRecipes[capableType] || buildingRecipes[1]; // TODO: shoudl default to []
  // TODO: use constructionInventory to update hasTally
  return (
    <>
      <SiteThumb image={thumbUrl}>
        <ClipCorner color="#333" dimension={10} />
      </SiteThumb>
      <Requirements>
        <label>Required Materials</label>
        <ItemsList>
          {ingredients.map(([tally, i, hasTally]) => (
            <ResourceRequirement
              key={i}
              hasTally={hasTally}
              needsTally={tally}
              resource={resources[i]}
              size="85px" />
          ))}
        </ItemsList>
      </Requirements>
    </>
  );
  return null;
};

const LotInfo = () => {
  const { asteroidId, plotId } = useStore(s => s.asteroids.plot || {});
  const { data: plot, isLoading } = usePlot(asteroidId, plotId);

  const [selectedBuilding, setSelectedBuilding] = useState();

  if (!plot) return null;
  if (plot && !plot.building) {
    return (
      <Wrapper>
        <HudMenuCollapsibleSection titleText="Empty Lot">
          <Description>{buildingDescriptions[0]}</Description>
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
          {Object.values(Capable.TYPES).map(({ name }, capableType) => {
            if (capableType === 0) return null;
            return (
              <BuildingRow
                key={capableType}
                complexity={
                  (capableType > 0 ? 1 : 0)
                  + (capableType > 2 ? 1 : 0)
                  + (capableType > 5 ? 1 : 0)
                  + (capableType > 7 ? 1 : 0)
                  + (capableType > 8 ? 1 : 0)
                }
                onClick={() => setSelectedBuilding(capableType)}
                selected={selectedBuilding === capableType}>
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
              <ConstructionPlan capableType={selectedBuilding} />
            </div>
          )}
        </HudMenuCollapsibleSection>
      </Wrapper>
    );
  }
  return (
    <Wrapper>
      <HudMenuCollapsibleSection titleText={plot.building.__t}>
        {plot && !isLoading && (
          <>
            <Description>{buildingDescriptions[plot.building?.capableType]}</Description>
            {!!Inventory.CAPACITIES[plot.building?.capableType][1] && (
              <>
                <Rule margin="15px" />
                <DetailRow>
                  <label>Maximum Storage Volume</label>
                  <div>{Inventory.CAPACITIES[plot.building.capableType][1].volume.toLocaleString()} m<sup>3</sup></div>
                </DetailRow>
                <DetailRow>
                  <label>Maximum Storage Mass</label>
                  <div>{Inventory.CAPACITIES[plot.building.capableType][1].mass.toLocaleString()} t</div>
                </DetailRow>
              </>
            )}
          </>
        )}
      </HudMenuCollapsibleSection>

      <HudMenuCollapsibleSection
        titleText="Construction"
        collapsed={plot.building.construction.status === Construction.STATUS_OPERATIONAL}
        borderless>
        <ConstructionPlan capableType={plot.building.capableType} />
      </HudMenuCollapsibleSection>
    </Wrapper>
  );
};

export default LotInfo;