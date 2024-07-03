import { useMemo, useState } from 'react';
import styled from 'styled-components';

import AsteroidsImage from '~/assets/images/sales/asteroids.png';
import CrewmatesImage from '~/assets/images/sales/crewmates.png';
import SwayImage from '~/assets/images/sales/sway.png';
import StarterPackImage from '~/assets/images/sales/starter_packs.png';
import ClipCorner from '~/components/ClipCorner';
import UserPrice from '~/components/UserPrice';
import useAsteroidSale from '~/hooks/useAsteroidSale';
import usePriceConstants from '~/hooks/usePriceConstants';
import useBlockTime from '~/hooks/useBlockTime';
import useStore from '~/hooks/useStore';
import { TOKEN, TOKEN_FORMAT } from '~/lib/priceUtils';
import { formatTimer } from '~/lib/utils';
import FundingMenu from './components/FundingMenu';
import LauncherDialog from './components/LauncherDialog';
import SKU from './components/SKU';
import PageLoader from '~/components/PageLoader';
import { useStarterPackPricing } from './components/StarterPack';

const storeAssets = {
  crewmates: 'Crewmates',
  sway: 'Sway',
  asteroids: 'Asteroids',
  packs: 'Starter Packs'
};

export const basicPackPriceUSD = 29;
export const basicPackSwayMin = 170000;
export const basicPackCrewmates = 2;
export const advPackPriceUSD = 89;
export const advPackSwayMin = 570000;
export const advPackCrewmates = 5;

const skuButtonCornerSize = 20;
const skuButtonMargin = 20;

const SKUButtons = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin: ${skuButtonMargin}px;
`;

const SKUFooter = styled.div`
  bottom: 0;
  left: 0;
  height: 40px;
  width: 100%;
  position: absolute;
`;

const SKULeftNote = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  bottom: -1px;
  border-radius: 0 2px 0 0;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 19px;
  height: 100%;
  left: 1px;
  padding: 0 20px;
  position: absolute;
  text-transform: uppercase;
  transition: color 150ms ease, background 150ms ease;
  & > b {
    color: white;
    font-weight: normal;
    margin-right: 4px;
  }
`;

const SKURightNote = styled.div`
  align-items: center;
  bottom: -1px;
  color: #888;
  display: flex;
  font-size: 14px;
  height: 100%;
  padding: 0 20px;
  position: absolute;
  right: 0;
  & > b {
    color: white;
    font-weight: normal;
    margin-right: 4px;
  }
`;

const SKUButton = styled.div`
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex: 0 0 calc(50% - ${2 * skuButtonMargin}px);
  flex-direction: column;
  height: 240px;
  margin: ${skuButtonMargin}px;
  position: relative;

  & > label {
    display: block;
    font-size: 28px;
    font-weight: normal;
    padding: 14px 0 0 20px;
    text-transform: uppercase;
  }

  &:before {
    content: "";
    background: linear-gradient(to top, #0f2a35, #21667e);
    border: 1px solid ${p => p.theme.colors.main};
    ${p => p.theme.clipCorner(skuButtonCornerSize)};
    display: block;
    height: 100%;
    left: 0;
    opacity: 0.4;
    position: absolute;
    top: 0;
    transition: opacity 150ms ease;
    width: 100%;
    z-index: -1;
  }
  & > svg:last-child {
    color: rgba(${p => p.theme.colors.mainRGB}, 0.4);
    transition: color 150ms ease;
  }
  &:hover {
    &:before {
      opacity: 1;
    }
    & > svg:last-child {
      color: rgba(${p => p.theme.colors.mainRGB}, 1);
    }

    ${SKULeftNote} {
      background: rgba(${p => p.theme.colors.mainRGB}, 0.7);
      color: white;
    }
  }
`;

const SKUImagery = styled.div`
  align-items: center;
  background: url(${p => p.src});
  background-position: center center;
  background-repeat: no-repeat;
  background-size: contain;
  display: flex;
  flex: 1;
  justify-content: center;
  position: absolute;
  bottom: 30px;
  left: 0;
  height: calc(100% - 70px);
  width: 100%;
`;

const SkuSelector = ({ onSelect }) => {
  const blockTime = useBlockTime();
  const { data: asteroidSale } = useAsteroidSale();
  const { data: priceConstants } = usePriceConstants();
  const packs = useStarterPackPricing();

  const paneMeta = useMemo(() => {
    const asteroidExtra = {};

    const remaining = asteroidSale ? (Number(asteroidSale.limit) - Number(asteroidSale.volume)) : 0;
    if (remaining > 0) {
      asteroidExtra.leftNote = <><b>{remaining.toLocaleString()}</b> Remaining</>;
    } else {
      const now = blockTime || Math.floor(Date.now() / 1e3);
      asteroidExtra.rightNote = (
        <>
          <b>{formatTimer(Math.ceil(now / 1e6) * 1e6 - now, 2)}</b> Until Next Sales Period
        </>
      );
    }
    return {
      'asteroids': {
        imagery: AsteroidsImage,
        ...asteroidExtra,
      },
      'crewmates': {
        imagery: CrewmatesImage,
        leftNote: (
          <>
            <UserPrice
              price={priceConstants?.ADALIAN_PURCHASE_PRICE}
              priceToken={priceConstants?.ADALIAN_PURCHASE_TOKEN}
              format={TOKEN_FORMAT.SHORT} />
            {' '}Each
          </>
        )
      },
      'packs': {
        imagery: StarterPackImage,
        leftNote: <>From {packs.basic.price.to(TOKEN.USDC, TOKEN_FORMAT.SHORT)}</>
      },
      'sway': {
        imagery: SwayImage,
        leftNote: 'Buy on Exchange',
      }
    };
  }, [asteroidSale, blockTime, packs, priceConstants])

  return (
    <SKUButtons>
      {Object.keys(storeAssets).map((asset, i) => (
        <SKUButton key={asset} onClick={() => onSelect(i)}>
          <label>{storeAssets[asset]}</label>
          <SKUImagery src={paneMeta[asset].imagery} />
          <SKUFooter>
            {paneMeta[asset].leftNote && <SKULeftNote>{paneMeta[asset].leftNote}</SKULeftNote>}
            {paneMeta[asset].rightNote && <SKURightNote>{paneMeta[asset].rightNote}</SKURightNote>}
          </SKUFooter>
          <ClipCorner dimension={skuButtonCornerSize} />
        </SKUButton>
      ))}
    </SKUButtons>
  );
};

const Store = () => {
  const { data: priceConstants, isLoading } = usePriceConstants();

  const initialSubpage = useStore(s => s.launcherSubpage);

  const initialSelection = useMemo(() => {
    const linkedSelectionIndex = Object.keys(storeAssets).indexOf(initialSubpage);
    return linkedSelectionIndex >= 0 ? linkedSelectionIndex : undefined;
  }, [initialSubpage]);

  const [selection, setSelection] = useState(initialSelection);
  const isSelected = selection !== undefined;

  const panes = useMemo(() => {
    return Object.keys(storeAssets).map((k) => ({
      label: storeAssets[k],
      pane: <SKU asset={k} onBack={() => setSelection()} />,
    }))
  }, []);

  if (!priceConstants?.ADALIAN_PURCHASE_PRICE) return isLoading ? <PageLoader /> : null;
  return (
    <LauncherDialog
      bottomLeftMenu={<FundingMenu />}
      panes={isSelected ? panes : []}
      preselect={selection}
      singlePane={isSelected ? null : <SkuSelector onSelect={setSelection} />} />
  );
};

export default Store;