import { useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { PlusIcon, ResourceGroupIcons } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import { hexToRGB } from '~/theme';
import useAsteroidAbundances from '~/hooks/useAsteroidAbundances';
import useAsteroid from '~/hooks/useAsteroid';
import { keyify } from '~/lib/utils';
import AsteroidBonuses from '../../details/asteroidDetails/AsteroidBonuses';
import { majorBorderColor, HudMenuCollapsibleSection } from './components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ResourceWrapper = styled.div`
  flex: 1;
  overflow: hidden;
`;

const Row = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 8px 0;
  & > *:first-child {
    font-size: 24px;
  }
  & > label {
    flex: 1;
    padding-left: 4px;
  }
  & > span {
    color: #999;
    padding-right: 8px;
  }
`;

const Title = styled(Row)`
  border-bottom: 1px solid ${majorBorderColor};
  font-size: 16px;
  padding-top: 0;
  & > *:first-child {
    height: 24px;
    width: 24px;
  }
`;

const Circle = styled.div`
  background: currentColor;
  border-radius: 8px;
  display: inline-block;
  height: 8px;
  margin: 0 8px;
  width: 8px;
`;
const ResourceList = styled.div``;
const Resource = styled(Row)`
  cursor: ${p => p.theme.cursors.active};
  &:hover {
    background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.15);
  }
  ${p => p.selected && `
    background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.3);
    & span {
      color: white !important;
    }
  `}

  & > svg:first-child {
    color: ${p => p.theme.colors.resources[p.category]};
    font-size: 16px;
    margin: 0 4px;
  }
`;

const ResourceGroup = styled.div`
  ${Title} > svg {
    fill: ${p => p.theme.colors.resources[p.category]};
  }
  ${Circle} {
    color: ${p => p.theme.colors.resources[p.category]};
  }
  ${Resource} {
    & span {
      color: ${p => p.theme.colors.resources[p.category]};
    }
  }
  margin-bottom: 20px;
  &:last-child {
    margin-bottom: 0;
  }
`;

const Resources = ({ onClose }) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const groupAbundances = useAsteroidAbundances(asteroid);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const resourceMap = useStore(s => s.asteroids.resourceMap);

  const onClick = useCallback((i) => () => {
    if (resourceMap.active && resourceMap.selected === Number(i)) {
      dispatchResourceMapSelect();
    } else {
      dispatchResourceMapSelect(i);
      dispatchResourceMapToggle(true);
    }
  }, [resourceMap]);

  // hide emissive when the panel is closed
  useEffect(() => {
    if (!resourceMap.active && groupAbundances.length > 0) {
      if (!resourceMap.selected) {
        dispatchResourceMapSelect(groupAbundances[0].resources[0].i);
      }
      dispatchResourceMapToggle(true);
    }
    return () => {
      dispatchResourceMapToggle(false);
    };
  }, []);

  const unpackedBonuses = useMemo(() => Asteroid.Entity.getBonuses(asteroid) || [], asteroid);
  
  const nonzeroBonuses = useMemo(() => unpackedBonuses.filter((b) => b.level > 0), [unpackedBonuses]);

  return (
    <Wrapper>
      <ResourceWrapper>
        <HudMenuCollapsibleSection titleText="Resource Map">
          <div>
            {groupAbundances.map(({ categoryKey, category, resources, abundance: groupAbundance }) => (
              <ResourceGroup key={categoryKey} category={categoryKey}>
                <Title>
                  {ResourceGroupIcons[keyify(category).toLowerCase()]}
                  <label>{category}</label>
                  <span>{(groupAbundance * 100).toFixed(1)}%</span>
                </Title>
                <ResourceList>
                  {resources.map(({ i, categoryKey, name, abundance }) => {
                    const selected = resourceMap.active && resourceMap.selected === Number(i);
                    return (
                      <Resource key={name}
                        category={categoryKey}
                        onClick={onClick(i)}
                        selected={selected}>
                        {selected ? <PlusIcon /> : <Circle />}
                        <label>{name}</label>
                        <span>{(abundance * 100).toFixed(1)}%</span>
                      </Resource>
                    );
                  })}
                </ResourceList>
              </ResourceGroup>
            ))}
          </div>
        </HudMenuCollapsibleSection>
      </ResourceWrapper>
      {nonzeroBonuses?.length > 0 && (
        <div>
          <HudMenuCollapsibleSection titleText="Yield Bonuses" borderless>
            <AsteroidBonuses bonuses={unpackedBonuses} fullWidth />
          </HudMenuCollapsibleSection>
        </div>
      )}
    </Wrapper>
  );
};

export default Resources;