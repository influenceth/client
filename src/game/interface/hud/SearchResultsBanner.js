import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import ClipCorner from '~/components/ClipCorner';
import Dropdown from '~/components/DropdownV2';
import { EccentricityIcon, InclinationIcon, OrbitalPeriodIcon, RadiusIcon } from '~/components/Icons';
import useAsteroidSearch from '~/hooks/useAsteroidSearch';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import { background } from './HudMenu';

const cornerSize = 15;

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  width: 560px;
  transform: ${p => p.visible ? 'translateY(20px)' : 'translateY(-80px)'};
  transition: transform 250ms ease;
`;

const TotalHits = styled.div`
  color: ${p => p.theme.colors.main};
  margin-bottom: 2px;
  font-size: 110%;
  text-align: center;
  text-transform: uppercase;
`;

const Container = styled.div`
  background: transparent;
  border: 1px solid ${p => p.theme.colors.main};
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    ${cornerSize}px 100%,
    0% calc(100% - ${cornerSize}px)
  );
  padding: 3px;
  pointer-events: all;
  position: relative;
  width: 100%;
`;

const InnerContainer = styled(Container)`
  align-items: center;
  background: ${background};
  border: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: 45px;
  padding: 0 12px;
`;

const Showing = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex: 1;
  &:before {
    background: ${p => p.theme.colors.main};
    content: '';
    display: inline-block;
    height: 8px;
    margin-right: 8px;
    transform: rotate(45deg);
    transform-origin: center center;
    width: 8px;
  }
`;
const SortDirection = styled.div`
  cursor: ${p => p.theme.cursors.active};
  font-size: 90%;
  opacity: 0.5;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 1;
  }
  text-align: center;
  width: 80px;
`;
const SortSelection = styled.div`
  display: flex;
  flex: 1;
  justify-content: flex-end;
`;

const SearchResultsBanner = () => {
  const { data: asteroidSearch } = useAsteroidSearch();

  const openHudMenu = useStore(s => s.openHudMenu);
  const sort = useStore(s => s.asteroids.sort || ['r', 'desc']);
  const updateSort = useStore(s => s.dispatchSortUpdated);
  
  const data = useMemo(() => {
    if (openHudMenu === 'belt.System Search') {
      return {
        total: asteroidSearch?.total,
        showing: asteroidSearch?.hits?.length || 0,
      }

    } else if (openHudMenu === 'asteroid.Lot Search') {

    }
    return null;
  }, [asteroidSearch, openHudMenu])

  const totalHits = useMemo(() => {
    if (data?.total > 2000) {
      return `${Math.floor(data.total / 1e3)}k${data.total === 250000 ? '' : '+'} Results`;
    }
    return `${(data?.total || 0).toLocaleString()} Results`
  }, [data?.total]);

  const toggleSortOrder = useCallback(() => {
    updateSort([sort[0], sort[1] === 'asc' ? 'desc' : 'asc']);
  }, [sort]);

  const updateSortOrder = useCallback((option) => {
    updateSort([option.value || 'r', sort[1] || 'desc']);
  }, [sort]);

  const sortOptions = useMemo(() => ([
    { icon: <RadiusIcon />, label: 'Diameter', value: 'r' },
    { icon: <OrbitalPeriodIcon />, label: 'Orbital Period', value: 'orbital.a' },
    { icon: <InclinationIcon />, label: 'Inclination', value: 'orbital.i' },
    { icon: <EccentricityIcon />, label: 'Eccentricity', value: 'orbital.e' },
  ]), []);

  return (
    <Wrapper visible={!!data}>
      <TotalHits>{totalHits}</TotalHits>
      <Container>
        <InnerContainer>
          {data && (
            <>
                <Showing>Showing: {data.showing > 0 ? `1 - ${data.showing.toLocaleString()}` : 0}</Showing>
                <SortDirection onClick={toggleSortOrder}>
                  {sort[1] === 'asc' ? 'Low > High' : 'High > Low'}
                </SortDirection>
                <SortSelection>
                  <Dropdown
                    initialSelection={sort[0] || 'r'}
                    onChange={updateSortOrder}
                    options={sortOptions}
                    width="180px" />
                </SortSelection>
            </>
          )}
        </InnerContainer>
        <ClipCorner dimension={cornerSize} color={theme.colors.main} />
        <ClipCorner dimension={cornerSize} color={theme.colors.main} flip />
      </Container>
    </Wrapper>
  );
};

export default SearchResultsBanner;