import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactTooltip from 'react-tooltip';
import { useHistory } from 'react-router-dom';

import Dropdown from '~/components/Dropdown';
import { CloseIcon, ResourceGroupIcons } from '~/components/Icons';
import IconButton from '~/components/IconButton';
import useAsteroidAssets from '~/hooks/useAsteroidAssets';
import useStore from '~/hooks/useStore';
import { hexToRGB } from '~/theme';

const Wrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 20px;
  position: relative;
`;
const CloseButton = styled(IconButton)`
  border: 0px;
  margin-right: 0;
  padding: 2px;
  pointer-events: all;
  position: absolute;
  height: 24px;
  right: 0;
  top: -8px;
  width: 24px;
`;
const ResourceIcon = styled.div`
  background-color: black;
  background-position: center center;
  background-size: contain;
  border: 1px solid #333;
  cursor: ${p => p.theme.cursors.active};
  height: 125px;
  pointer-events: all;
  transition: border-color 250ms ease;
  width: 125px;
  &:hover {
    border-color: #777;
  }
`;
const ResourceDetails = styled.div`
  color: #999;
  flex: 1;
  font-size: 15px;
  padding-left: 20px;
  & > h3 {
    font-size: inherit;
    font-weight: normal;
    margin: 0 0 12px;
    & b {
      color: white;
    }
  }
  & > label {
    margin-bottom: 8px;
  }
`;
const DropdownContainer = styled.div`
  margin-top: 4px;
  pointer-events: all;
  & > div > button {
    font-size: 110%;
  }
`;
const CategoryButtons = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 16px;
`;
const CategoryButton = styled.div`
  ${p => p.selected && `
    background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.2);
  `}
  border-radius: 6px;
  color: ${p => p.theme.colors.resources[p.category]};
  cursor: ${p => p.theme.cursors.active};
  margin-right: 4px;
  pointer-events: all;

  &:hover {
    background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.3);
  }
  & > svg {
    fill: currentColor;
    height: 28px;
    width: 28px;
  }
`;

const ResourceMapSelector = ({ asteroid, onClose }) => {
  const history = useHistory();
  const { data: asteroidAssets, isLoading } = useAsteroidAssets(asteroid);
  const sceneMod = useStore(s => s.asteroids.sceneMod);

  const [category, setCategory] = useState();
  const [resource, setResource] = useState();

  const goToModelViewer = useCallback(() => {
    history.push(`/model-viewer/${resource.label}`)
  }, [resource?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCategory = useCallback((selected) => () => {
    if (selected.category !== category?.category) {
      setCategory(selected);
      setResource(selected.resources[0]);
    }
  }, [category?.category]);

  const selectResource = useCallback((selected) => {
    setResource(selected);
  }, []);

  const resourceTally = useMemo(() => {
    return Object.values(asteroidAssets).reduce((acc, cur) => acc + cur.resources.length, 0);
  }, [asteroidAssets]);

  useEffect(() => {
    if (!isLoading) {
      if (sceneMod?.params?.resource) {
        asteroidAssets.forEach((c) => {
          c.resources.forEach((r) => {
            if (r.label === sceneMod.params.resource) {
              setCategory(c);
              setResource(r);
              console.log('setCAtegory', c.label);
              console.log('setResource', r.label);
            }
          });
        });
      } else {
        selectCategory(asteroidAssets[0])();
      }
    }
  }, [isLoading, sceneMod]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => ReactTooltip.rebuild(), []);

  if (asteroidAssets?.length === 0) return null;
  if (!category) return null;
  return (
    <Wrapper>
      <CloseButton onClick={onClose}><CloseIcon /></CloseButton>
      <ResourceIcon
        onClick={goToModelViewer}
        style={{ backgroundImage: `url(${resource.iconUrl})` }} />
      <ResourceDetails>
        <h3><b>{resourceTally} Raw Material{resourceTally === 1 ? '' : 's'}</b> Present</h3>
        <label>Density Map Target:</label>
        <DropdownContainer>
          <Dropdown
            dropUp
            initialSelection={category.resources.findIndex((r) => r.label === resource.label)}
            onChange={selectResource}
            options={category.resources}
            footnote={(r) => `${(100 * r.abundance).toFixed(1)}%`}
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
    </Wrapper>
  );
};

export default ResourceMapSelector;