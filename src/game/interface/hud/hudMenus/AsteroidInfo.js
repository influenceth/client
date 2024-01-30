import { useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Asteroid, Entity, Product, Ship } from '@influenceth/sdk';
import ReactTooltip from 'react-tooltip';

import AddressLink from '~/components/AddressLink';
import CrewIndicator from '~/components/CrewIndicator';
import Ether from '~/components/Ether';
import { EccentricityIcon, InclinationIcon, LinkIcon, LocationIcon, MagnifyingIcon, OrbitalPeriodIcon, RadiusIcon, ResourceGroupIcons, ScanAsteroidIcon, SemiMajorAxisIcon, SurfaceAreaIcon, WalletIcon } from '~/components/Icons';
import formatters from '~/lib/formatters';
import { keyify, reactBool } from '~/lib/utils';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, opacityAnimation, Scrollable, Tray } from './components/components';
import TitleArea from './components/TitleArea';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import useAsteroidLotData from '~/hooks/useAsteroidLotData';
import theme from '~/theme';
import useCrew from '~/hooks/useCrew';
import usePriceConstants from '~/hooks/usePriceConstants';
import Button from '~/components/ButtonAlt';

const InfoRow = styled.div`
  align-items: center;
  border: solid rgba(255, 255, 255, 0.1);
  border-width: 0 0 1px;
  &:first-child {
    border-top-width: 1px;
  }
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 5px 0;
  width: 100%;

  & > svg {
    color: #999;
    font-size: 24px;
    margin-right: 10px;
  }
  & > label {
    color: #999;
    flex: 1;
  }
  & > span {
    color: white;
  }
`;

const Rarity = styled.span`
  color: ${p => p.theme.colors.rarity[p.rarity]};
  font-weight: bold;
  &:before {
    content: "${p => p.rarity}";
  }
`;

const Unowned = styled.span`
  color: ${p => p.theme.colors.main};
`;
const Uncontrolled = styled.span`
  color: ${p => p.theme.colors.error};
`;
const ReadyToScan = styled.span`
  color: ${p => p.theme.colors.success};
`;
const Scanning = styled.span`
  animation: ${opacityAnimation} 1000ms linear infinite;
  color: #AAA;
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
    height: 28px;
    width: 28px;
  }
`;

const SubtitleRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const AsteroidInfo = ({ onClose }) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const dispatchZoomStatus = useStore(s => s.dispatchZoomStatusChanged);

  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: ships } = useAsteroidShips(asteroidId);
  const { data: lotData } = useAsteroidLotData(asteroidId);
  const { data: administrator } = useCrew(asteroid?.Control?.controller?.id);
  const { data: priceConstants } = usePriceConstants();

  const shipsInOrbitTally = useMemo(() => {
    return (ships || []).filter((ship) => {
      return ship.Location.location.label === Entity.IDS.ASTEROID && ship.Ship.status === Ship.STATUSES.AVAILABLE;
    }).length;
  }, [ships]);

  const structuresTally = useMemo(() => {
    let structures = 0;
    if (lotData) {
      for (let i = 1; i < lotData.length; i++) {
        if (lotData[i] >> 4) structures++;
      }
    }
    return structures;
  }, [lotData]);

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

  const zoomIn = useCallback(() => {
    dispatchZoomStatus('zooming-in');
  }, []);

  useEffect(() => ReactTooltip.rebuild(), [resourceCategories]);

  if (!asteroid) return null;
  return (
    <>
      <Scrollable hasTray={reactBool(zoomStatus === 'out')}>
        <TitleArea
          title={formatters.asteroidName(asteroid)}
          subtitle={
            <SubtitleRow>
              <div>
                {Asteroid.Entity.getSize(asteroid)}{' '}
                <b>{Asteroid.Entity.getSpectralType(asteroid)}{'-type'}</b>
              </div>
              <span>
                {!asteroid.Nft?.owner
                  ? <Unowned>Unowned</Unowned>
                  : (
                    <>
                      {!asteroid.Control.controller.id
                        ? <Uncontrolled>Needs Administrator</Uncontrolled>
                        : (
                          <>
                            {asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.UNSCANNED && <ReadyToScan>Ready to Scan</ReadyToScan>}
                            {asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.SURFACE_SCANNING && <Scanning scanning>Scanning...</Scanning>}
                            {asteroid.Celestial.scanStatus >= Asteroid.SCAN_STATUSES.SURFACE_SCANNED && <Rarity rarity={Asteroid.Entity.getRarity(asteroid)} />}
                            {/*asteroid.Celestial.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNING && <Unscanned scanning>Scanning...</Unscanned>*/}
                          </>
                        )}
                    </>
                  )
                }
              </span>
            </SubtitleRow>
          }
          upperLeft={<><LocationIcon /> #{asteroid.id.toLocaleString()}</>}
          upperRight={
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
          }
        />

        <HudMenuCollapsibleSection title="Attributes">
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
          {priceConstants && !asteroid.Nft?.owner && (
            <InfoRow>
              <WalletIcon />
              <label>Price</label>
              <span style={{ color: theme.colors.main }}><Ether>{formatters.asteroidPrice(asteroid.Celestial.radius, priceConstants)}</Ether></span>
            </InfoRow>
          )}
        </HudMenuCollapsibleSection>

        {asteroid.Nft?.owner && (
          <HudMenuCollapsibleSection title="Administration" collapsed>
            <CrewIndicator cardWidth={54} crew={administrator} label="Administrator" noCrewText="Not Set" />

            <InfoRow style={{ borderBottom: 0 }}>
              <label>Lots</label>
              <span>{(parseInt(formatters.surfaceArea(asteroid.Celestial.radius)) || 0).toLocaleString()}</span>
            </InfoRow>
            <InfoRow style={{ borderBottom: 0 }}>
              <label>Structures</label>
              <span>{(structuresTally || 0).toLocaleString()}</span>
            </InfoRow>
            <InfoRow>
              <label>Ships in Orbit</label>
              <span>{(shipsInOrbitTally || 0).toLocaleString()}</span>
            </InfoRow>
            <InfoRow>
              <WalletIcon />
              <label>Owner Information</label>
              <span>
                <AddressLink
                  address={asteroid.Nft?.owner}
                  chain={asteroid.Nft?.chain}
                  noUnderline
                  style={{ color: theme.colors.main }}>
                  Link <LinkIcon />
                </AddressLink>
              </span>
            </InfoRow>
          </HudMenuCollapsibleSection>
        )}

        <HudMenuCollapsibleSection title="Description" collapsed>
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection title="Lot Policy" collapsed>
        </HudMenuCollapsibleSection>

        
      </Scrollable>
      
      {zoomStatus === 'out' && (
        <Tray>
          <Button onClick={zoomIn} subtle>
            <MagnifyingIcon style={{ marginRight: 8 }} /> Zoom to Asteroid
          </Button>
        </Tray>
      )}

    </>
  );
};

export default AsteroidInfo;