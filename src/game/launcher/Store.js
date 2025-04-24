import { useMemo, useState } from 'react';

import AsteroidsHeroImage from '~/assets/images/sales/asteroids_hero.png';
import CrewmatesHeroImage from '~/assets/images/sales/crewmates_hero.png';
import SwayHeroImage from '~/assets/images/sales/sway_hero.jpg';
import StarterPackHeroImage from '~/assets/images/sales/starter_packs_hero.jpg';
import usePriceConstants from '~/hooks/usePriceConstants';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import PageLoader from '~/components/PageLoader';
import LauncherDialog from './components/LauncherDialog';
import AsteroidSKU from './store/AsteroidSKU';
import CrewmateSKU from './store/CrewmateSKU';
import FaucetSKU from './store/FaucetSKU';
import StarterPackSKU from './store/StarterPackSKU';
import SwaySKU from './store/SwaySKU';
import SKULayout from './store/components/SKULayout';
import { appConfig } from '~/appConfig';
import { useSwayBalance } from '~/hooks/useWalletTokenBalance';

const storeAssets = {
  packs: 'Starter Packs',
  asteroids: 'Asteroids',
  crewmates: 'Crewmates',
  sway: 'Sway',
};
if (appConfig.get('Starknet.chainId') === '0x534e5f5345504f4c4941') {
  storeAssets.faucets = 'Faucets';
}

const coverImages = {
  asteroids: AsteroidsHeroImage,
  crewmates: CrewmatesHeroImage,
  packs: StarterPackHeroImage,
  sway: SwayHeroImage,
};

const Store = () => {
  const { crew, crewmateMap, adalianRecruits } = useCrewContext();
  const { data: swayBalance } = useSwayBalance();
  const { data: priceConstants, isLoading } = usePriceConstants();

  const initialSubpage = useStore(s => s.launcherSubpage);

  // force to starter packs if !(hasSway || hasCrewmateCredits || hasCrewmates)
  const isStarterPackUser = useMemo(
    () => !(swayBalance > 0n || adalianRecruits.length > 0 || Object.keys(crewmateMap || {}).length > 0),
    [adalianRecruits, crewmateMap, swayBalance]
  );

  const eligibleAssetKeys = useMemo(() => {
    return Object.keys(storeAssets)
      .filter((asset) => isStarterPackUser ? ['packs', 'faucets'].includes(asset) : (asset !== 'packs'))
  }, [isStarterPackUser]);

  const initialSelection = useMemo(() => {
    // use specified starting page, or default (starter packs for new users, sway for existing)
    let selectionKey = initialSubpage || (isStarterPackUser ? 'packs' : 'sway');
    const linkedSelectionIndex = eligibleAssetKeys.indexOf(selectionKey);
    return linkedSelectionIndex >= 0 ? linkedSelectionIndex : 0;
  }, [!crew, initialSubpage, isStarterPackUser]);

  const panes = useMemo(() => {
    return eligibleAssetKeys.map((asset) => ({
      label: storeAssets[asset],
      pane: (
        <div style={{ height: '100%' }}>
          <SKULayout coverImage={coverImages[asset]}>
            {asset === 'asteroids' && <AsteroidSKU />}
            {asset === 'crewmates' && <CrewmateSKU />}
            {asset === 'packs' && <StarterPackSKU />}
            {asset === 'sway' && <SwaySKU />}
            {asset === 'faucets' && <FaucetSKU />}
          </SKULayout>
        </div>
      ),
    }))
  }, [isStarterPackUser]);

  if (!priceConstants?.ADALIAN_PURCHASE_PRICE) return isLoading ? <PageLoader /> : null;
  if (panes.length === 1) return <LauncherDialog singlePane={[panes[0].pane]} />;
  return (
    <LauncherDialog
      panes={panes}
      preselect={initialSelection} />
  );
};

export default Store;