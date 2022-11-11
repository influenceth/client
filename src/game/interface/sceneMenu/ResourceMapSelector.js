import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { useHistory } from 'react-router-dom';

import Dropdown from '~/components/Dropdown';
import { ResourceGroupIcons } from '~/components/Icons';
import useAsteroidAssets from '~/hooks/useAsteroidAssets';
import useStore from '~/hooks/useStore';
import { hexToRGB } from '~/theme';

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
  const { data: asteroidAssets, isLoading } = useAsteroidAssets(asteroid);
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const showResourceMap = useStore(s => s.asteroids.showResourceMap);

  const [category, setCategory] = useState();
  const [resource, setResource] = useState();

  const goToModelViewer = useCallback(() => {
    history.push(`/model-viewer/${resource.label}`)
  }, [resource?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCategory = useCallback((selected, forceReset) => () => {
    if (forceReset || selected.category !== category?.category) {
      dispatchResourceMap(selected.resources[0]);
    }
  }, [category?.category, dispatchResourceMap]);

  const selectResource = useCallback((selected) => {
    dispatchResourceMap(selected);
  }, [dispatchResourceMap]);

  useEffect(() => {
    if (active && !isLoading) {
      if (showResourceMap) {
        asteroidAssets.forEach((c) => {
          c.resources.forEach((r) => {
            if (r.label === showResourceMap.label) {
              setCategory(c);
              setResource(r);
            }
          });
        });
      } else if (asteroidAssets?.length) {
        selectCategory(asteroidAssets[0], true)();
      }
    }
  }, [active, isLoading, showResourceMap]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => ReactTooltip.rebuild(), []);

  if (asteroidAssets?.length === 0) return null;
  if (!category) return null;
  return (
    <Wrapper>
      <Label>Resource Map:</Label>
      <Container>
        <ResourceIcon
          onClick={goToModelViewer}
          style={{ backgroundImage: `url(${resource.iconUrls.w85})` }} />
        <ResourceDetails>
          <DropdownContainer selectedCategory={showResourceMap?.category}>
            <Dropdown
              buttonBackground
              buttonBorderless
              dropUp
              footnote={(r) => `${(100 * r.abundance).toFixed(1)}%`}
              initialSelection={category.resources.findIndex((r) => r.label === resource.label)}
              onChange={selectResource}
              options={category.resources}
              width="100%" />
          </DropdownContainer>
          <CategoryButtons>
            {asteroidAssets.map((c) => (
              <CategoryButton
                key={c.category}
                category={c.category}
                onClick={selectCategory(c)}
                selected={c.category === category.category}
                data-tip={c.label}
                data-place="right"
                data-for="global">
                {ResourceGroupIcons[c.category.toLowerCase()]}
              </CategoryButton>
            ))}
          </CategoryButtons>
        </ResourceDetails>
      </Container>
    </Wrapper>
  );
};

export default ResourceMapSelector;