import { useCallback, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Asteroid, Product } from '@influenceth/sdk';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';

import AddressLink from '~/components/AddressLink';
import Button from '~/components/ButtonAlt';
import Ether from '~/components/Ether';
import { EccentricityIcon, IdIcon, InclinationIcon, OrbitalPeriodIcon, RadiusIcon, ResourceGroupIcons, ScanAsteroidIcon, SemiMajorAxisIcon, SurfaceAreaIcon, WalletIcon } from '~/components/Icons';
import formatters from '~/lib/formatters';
import { keyify } from '~/lib/utils';
import useAsteroid from '~/hooks/useAsteroid';
import usePriceConstants from '~/hooks/usePriceConstants';
import useStore from '~/hooks/useStore';
import { majorBorderColor, opacityAnimation, Scrollable, Tray } from './components';

const InfoRow = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 8px 0;
  width: 100%;
  & > svg {
    color: white;
    font-size: 24px;
    margin-right: 10px;
  }
  & > label {
    color: white;
    flex: 1;
  }
  & > span {
    color: #999;
  }
`;

const TitleArea = styled.div`
  border-bottom: 1px solid ${majorBorderColor};
  padding: 12px 0 12px 10px;
  ${InfoRow} {
    border-bottom: 0;
    color: #999;
    padding: 10px 0 6px;
    & b {
      color: white;
      font-weight: normal;
    }
  }
`;

const Title = styled.div`
  font-size: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Rarity = styled.span`
  color: ${p => p.theme.colors.rarity[p.rarity]};
  font-weight: bold;
  &:before {
    content: "${p => p.rarity}";
  }
`;

const Unscanned = styled.span`
  color: #AAA;
  ${p => p.scanning && `animation: ${opacityAnimation} 1000ms linear infinite;`};
`;

const Resources = styled.span`
  display: inline-flex;
  flex-direction: row;
`;
const Resource = styled.span`
  & > svg {
    display: block;
    fill: ${p => p.theme.colors.resources[p.category]};
    margin-left: 6px;
    height: 24px;
    width: 24px;
  }
`;

const AsteroidInfo = ({ onClose }) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: priceConstants } = usePriceConstants();
  const history = useHistory();

  // get the categories of resources present on this asteroid
  const resourceCategories = useMemo(() => {
    return (Asteroid.SPECTRAL_TYPES[asteroid?.Celestial?.celestialType]?.resources || []).reduce((acc, productId) => {
      const category = Product.TYPES[productId]?.category;
      if (category && !acc.includes(category)) {
        return [...acc, category];
      }
      return acc;
    }, []);
  }, [asteroid?.Celestial?.celestialType]);

  const onClickDetails = useCallback(() => {
    onClose();
    history.push(`/asteroids/${asteroidId}`);
  }, [asteroidId]);

  useEffect(() => ReactTooltip.rebuild(), [resourceCategories]);

  if (!asteroid) return null;
  return (
    <>
      <Scrollable hasTray>
        <TitleArea>
          <Title>{formatters.asteroidName(asteroid)}</Title>
          <InfoRow style={{ fontSize: 16 }}>
            <span style={{ flex: 1 }}>
              {Asteroid.Entity.getSize(asteroid)}{' '}
              <b>{Asteroid.Entity.getSpectralType(asteroid)}{'-type'}</b>
            </span>
            <span>
              {asteroid.Celestial.scanStatus >= Asteroid.SCAN_STATUSES.SURFACE_SCANNED && <Rarity rarity={Asteroid.Entity.getRarity(asteroid)} />}
              {asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.UNSCANNED && <Unscanned>Unscanned</Unscanned>}
              {asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.SURFACE_SCANNING && <Unscanned scanning>Scanning...</Unscanned>}
              {/*asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNING && <Unscanned scanning>Scanning...</Unscanned>*/}
            </span>
          </InfoRow>
        </TitleArea>
        <TitleArea>
          <InfoRow>
            <label><b>Resource Groups</b></label>
            <Resources>
              {resourceCategories.map((category) => (
                <Resource
                  key={category}
                  category={keyify(category)}
                  data-tip={category}
                  data-place="left"
                  data-for="hudMenu">
                  {ResourceGroupIcons[keyify(category).toLowerCase()]}
                </Resource>
              ))}
            </Resources>
          </InfoRow>
        </TitleArea>
        <InfoRow>
          <IdIcon />
          <label>Asteroid ID</label>
          <span>{asteroid.id.toLocaleString()}</span>
        </InfoRow>
        {asteroid.Nft?.owner && (
          <InfoRow>
            <WalletIcon />
            <label>Owner</label>
            <span>
              <AddressLink address={asteroid.Nft?.owner} chain={asteroid.Nft?.chain} truncate />
            </span>
          </InfoRow>
        )}
        {priceConstants && !asteroid.Nft?.owner && (
          <InfoRow>
            <WalletIcon />
            <label>Price</label>
            <span>
              <Ether>{formatters.asteroidPrice(asteroid.Celestial.radius, priceConstants)}</Ether>
            </span>
          </InfoRow>
        )}
        <InfoRow>
          <ScanAsteroidIcon />
          <label>Spectral Type</label>
          <span>{formatters.spectralType(asteroid.Celestial.celestialType)}</span>
        </InfoRow>
        <InfoRow>
          <RadiusIcon />
          <label>Diameter</label>
          <span>{formatters.radius(2 * asteroid.Celestial.radius)}</span>
        </InfoRow>
        <InfoRow>
          <SurfaceAreaIcon />
          <label>Surface Area</label>
          <span>{formatters.surfaceArea(asteroid.Celestial.radius)}</span>
        </InfoRow>
        <InfoRow>
          <OrbitalPeriodIcon />
          <label>Orbital Period</label>
          <span>{formatters.period(asteroid.Orbit)}</span>
        </InfoRow>
        <InfoRow>
          <SemiMajorAxisIcon />
          <label>Semi-major Axis</label>
          <span>{formatters.axis(asteroid.Orbit.a)}</span>
        </InfoRow>
        <InfoRow>
          <InclinationIcon />
          <label>Inclination</label>
          <span>{formatters.inclination(asteroid.Orbit.inc)}</span>
        </InfoRow>
        <InfoRow>
          <EccentricityIcon />
          <label>Eccentricity</label>
          <span>{asteroid.Orbit.ecc}</span>
        </InfoRow>
      </Scrollable>
      <Tray>
        <Button onClick={onClickDetails}>
          Open Details
        </Button>
      </Tray>
    </>
  );
};

export default AsteroidInfo;