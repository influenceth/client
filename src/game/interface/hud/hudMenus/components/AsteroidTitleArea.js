import { useMemo } from '~/lib/react-debug';
import styled from 'styled-components';
import { Asteroid, Product } from '@influenceth/sdk';

import { LocationIcon, ResourceGroupIcons } from '~/components/Icons';
import formatters from '~/lib/formatters';
import { keyify } from '~/lib/utils';
import TitleArea from '../components/TitleArea';
import { opacityAnimation } from './components';

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

const AsteroidTitleArea = ({ asteroid }) => {
  const resourceCategories = useMemo(import.meta.url, () => {
    return (Asteroid.SPECTRAL_TYPES[asteroid?.Celestial?.celestialType]?.resources || []).reduce((acc, productId) => {
      const category = Product.TYPES[productId]?.category;
      if (category && !acc.includes(category)) {
        return [...acc, category];
      }
      return acc;
    }, []);
  }, [asteroid?.Celestial?.celestialType]);

  if (!asteroid) return null;
  return (
    <TitleArea
      background="Asteroid"
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
                  {!asteroid.Control?.controller?.id
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
              data-tooltip-content={category}
              data-tooltip-place="left"
              data-tooltip-id="hudMenuTooltip">
              {ResourceGroupIcons[keyify(category).toLowerCase()]}
            </Resource>
          ))}
        </Resources>
      }
    />
  );
}

export default AsteroidTitleArea;