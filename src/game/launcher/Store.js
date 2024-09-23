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

const storeAssets = {
  packs: 'Starter Packs',
  sway: 'Sway',
  crewmates: 'Crewmates',
  asteroids: 'Asteroids',
};
if (process.env.REACT_APP_CHAIN_ID === '0x534e5f5345504f4c4941') {
  storeAssets.faucets = 'Faucets';
}

const coverImages = {
  asteroids: AsteroidsHeroImage,
  crewmates: CrewmatesHeroImage,
  packs: StarterPackHeroImage,
  sway: SwayHeroImage,
};


const Store = () => {
  const { crew } = useCrewContext();
  const { data: priceConstants, isLoading } = usePriceConstants();

  const initialSubpage = useStore(s => s.launcherSubpage);

  const initialSelection = useMemo(() => {
    // use specified starting page, or default (starter packs for new users, sway for existing)
    let selectionKey = initialSubpage || (!!crew ? 'sway' : 'packs');
    const linkedSelectionIndex = Object.keys(storeAssets).indexOf(selectionKey);
    return linkedSelectionIndex >= 0 ? linkedSelectionIndex : 0;
  }, [!crew, initialSubpage]);

  const panes = useMemo(() => {
    return Object.keys(storeAssets).map((asset) => ({
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
  }, []);

  if (!priceConstants?.ADALIAN_PURCHASE_PRICE) return isLoading ? <PageLoader /> : null;
  return (
    <LauncherDialog
      panes={panes}
      preselect={initialSelection} />
  );
};

export default Store;