import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { useHistory } from 'react-router-dom';
import { Inventory } from '@influenceth/sdk';

import Dropdown from '~/components/Dropdown';
import { ResourceGroupIcons } from '~/components/Icons';
import useAsteroidAbundances from '~/hooks/useAsteroidAbundances';
import useStore from '~/hooks/useStore';
import { hexToRGB } from '~/theme';
import { keyify } from '~/lib/utils';

const Wrapper = styled.div`
  width: 100%;
  padding-bottom: 4px;
  padding-top: 4px;
`;

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

const Label = styled.div`
  font-size: 15px;
  padding-bottom: 6px;
`;

const ResourceIcon = styled.div`
  background-color: black;
  background-position: center center;
  background-size: contain;
  border: 1px solid #777;
  cursor: ${p => p.theme.cursors.active};
  height: 80px;
  pointer-events: all;
  transition: border-color 250ms ease;
  width: 80px;
  &:hover {
    border-color: #777;
  }
`;

const ResourceDetails = styled.div`
  flex: 1;
  padding-left: 12px;
`;
const DropdownContainer = styled.div`
  background: #111;
  border: 1px solid ${p => p.theme.colors.main};
  border-radius: 8px;
  margin-top: 4px;
  padding: 3px;
  pointer-events: all;
  & > div > button {
    border-radius: 4px;
    font-size: 100%;
    &:after {
      content: '●';
      color: ${p => p.theme.colors.resources[p.selectedCategory]};
      float: left;
      margin-left: 2px;
      margin-right: 6px;
      transform: scale(1.5);
    }
  }
`;
const CategoryButtons = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 6px;
`;
const CategoryButton = styled.div`
  ${p => p.selected && `
    background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.2);
  `}
  border-radius: 6px;
  color: ${p => p.theme.colors.resources[p.category]};
  cursor: ${p => p.theme.cursors.active};
  line-height: 24px;
  margin-right: 4px;
  padding: 4px;
  pointer-events: all;

  &:hover {
    background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.3);
  }
  & > svg {
    display: block;
    fill: currentColor;
    height: 24px;
    width: 24px;
  }
`;

const ResourceMapSelector = ({ active, asteroid }) => {
  const history = useHistory();
  const asteroidAssets = useAsteroidAbundances(asteroid);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const resourceMap = useStore(s => s.asteroids.resourceMap);

  const [category, setCategory] = useState();
  const [resource, setResource] = useState();

  const goToResourceViewer = useCallback(() => {
    history.push(`/resource-viewer/${resource.i}`)
  }, [resource?.i]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectResource = useCallback((selected) => {
    dispatchResourceMapSelect(selected.i);
  }, [dispatchResourceMapSelect]);

  const selectCategory = useCallback((selected) => () => {
    if (selected.categoryKey !== category?.categoryKey) {
      selectResource(selected.resources[0]);
    }
  }, [category?.categoryKey, selectResource]);

  // if resource map specified, initialize the local state
  useEffect(() => {
    if (active) {
      if (resourceMap?.active && asteroidAssets) {
        asteroidAssets.forEach((c) => {
          c.resources.forEach((r) => {
            if (Number(r.i) === resourceMap?.selected) {
              setCategory(c);
              setResource(r);
            }
          });
        });
      }
    }
  }, [active, resourceMap, asteroidAssets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => ReactTooltip.rebuild(), []);

  if (asteroidAssets?.length === 0) return null;
  if (!category) return null;
  return (
    <Wrapper>
      <Label>Resource Map:</Label>
      <Container>
        <ResourceIcon
          onClick={goToResourceViewer}
          style={{ backgroundImage: `url(${resource.iconUrls.w85})` }} />
        <ResourceDetails>
          <DropdownContainer selectedCategory={keyify(Inventory.RESOURCES[resourceMap?.selected]?.category)}>
            <Dropdown
              buttonBackground
              buttonBorderless
              dropUp
              footnote={(r) => `${(100 * r.abundance).toFixed(1)}%`}
              initialSelection={category.resources.findIndex((r) => r.name === resource.name)}
              labelKey="name"
              onChange={selectResource}
              options={category.resources}
              width="100%" />
          </DropdownContainer>
          <CategoryButtons>
            {asteroidAssets.map((c) => (
              <CategoryButton
                key={c.categoryKey}
                category={c.categoryKey}
                onClick={selectCategory(c)}
                selected={c.categoryKey === category.categoryKey}
                data-tip={c.category}
                data-place="right"
                data-for="global">
                {ResourceGroupIcons[c.categoryKey.toLowerCase()]}
              </CategoryButton>
            ))}
          </CategoryButtons>
        </ResourceDetails>
      </Container>
    </Wrapper>
  );
};

export default ResourceMapSelector;