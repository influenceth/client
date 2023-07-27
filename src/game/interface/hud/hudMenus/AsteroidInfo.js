import { useCallback, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Asteroid, Product } from '@influenceth/sdk';

import Ether from '~/components/Ether';
import { EccentricityIcon, IdIcon, InclinationIcon, OrbitalPeriodIcon, RadiusIcon, ResourceGroupIcons, ScanAsteroidIcon, SemiMajorAxisIcon, SurfaceAreaIcon, WalletIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import formatters from '~/lib/formatters';
import AddressLink from '~/components/AddressLink';
import useSale from '~/hooks/useSale';
import useAsteroidAbundances from '~/hooks/useAsteroidAbundances';
import { keyify } from '~/lib/utils';
import IconButton from '~/components/IconButton';
import ReactTooltip from 'react-tooltip';
import Button from '~/components/ButtonAlt';
import { useHistory } from 'react-router-dom';

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
  ${p => p.scanned && `animation: ${opacityAnimation} 1000ms linear infinite;`};
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
  const { data: sale } = useSale();
  const history = useHistory();

  // get the categories of resources present on this asteroid
  const resourceCategories = useMemo(() => {
    return (Asteroid.SPECTRAL_TYPES[asteroid?.spectralType]?.resources || []).reduce((acc, productId) => {
      const category = Product.TYPES[productId]?.category;
      if (category && !acc.includes(category)) {
        return [...acc, category];
      }
      return acc;
    }, []);
  }, [asteroid?.spectralType]);

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
              {Asteroid.getSize(asteroid.r)}{' '}
              <b>{Asteroid.getSpectralType(asteroid.spectralType)}{'-type'}</b>
            </span>
            <span>
              {asteroid.scanned && <Rarity rarity={Asteroid.getRarity(asteroid.bonuses)} />}
              {!asteroid.scanned && asteroid.scanCompletionTime && <Unscanned scanning>Scanning...</Unscanned>}
              {!asteroid.scanned && !asteroid.scanCompletionTime && <Unscanned>Unscanned</Unscanned>}
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
          <span>{asteroid.i.toLocaleString()}</span>
        </InfoRow>
        {asteroid.owner && (
          <InfoRow>
            <WalletIcon />
            <label>Owner</label>
            <span>
              <AddressLink address={asteroid.owner} chain={asteroid.chain} truncate />
            </span>
          </InfoRow>
        )}
        {sale && !asteroid.owner && (
          <InfoRow>
            <WalletIcon />
            <label>Price</label>
            <span>
              <Ether>{formatters.asteroidPrice(asteroid.r, sale)}</Ether>
            </span>
          </InfoRow>
        )}
        <InfoRow>
          <ScanAsteroidIcon />
          <label>Spectral Type</label>
          <span>{formatters.spectralType(asteroid.spectralType)}</span>
        </InfoRow>
        <InfoRow>
          <RadiusIcon />
          <label>Diameter</label>
          <span>{formatters.radius(2 * asteroid.radius)}</span>
        </InfoRow>
        <InfoRow>
          <SurfaceAreaIcon />
          <label>Surface Area</label>
          <span>{formatters.surfaceArea(asteroid.r)}</span>
        </InfoRow>
        <InfoRow>
          <OrbitalPeriodIcon />
          <label>Orbital Period</label>
          <span>{formatters.period(asteroid.orbital)}</span>
        </InfoRow>
        <InfoRow>
          <SemiMajorAxisIcon />
          <label>Semi-major Axis</label>
          <span>{formatters.axis(asteroid.orbital.a)}</span>
        </InfoRow>
        <InfoRow>
          <InclinationIcon />
          <label>Inclination</label>
          <span>{formatters.inclination(asteroid.orbital.i)}</span>
        </InfoRow>
        <InfoRow>
          <EccentricityIcon />
          <label>Eccentricity</label>
          <span>{asteroid.orbital.e}</span>
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