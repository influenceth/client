import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import CrewmateCardFramed from '~/components/CrewmateCardFramed';
import { BuildingIcon, CheckIcon, CrewmateCreditIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import { hexToRGB } from '~/theme';
import { PurchaseForm } from './components/PurchaseForm';
import SKUTitle from './components/SKUTitle';
import SKUButton from './components/SKUButton';
import SKUHighlight from './components/SKUHighlight';
import StripeCheckout from './StripeCheckout';
import useStarterPacks from '~/hooks/useStarterPacks';

const StarterPacksOuter = styled.div`
  display: flex;
  flex-direction: row;
  height: 440px;
  width: 100%;
  & > div {
    flex: 1;
  }
`;

const StarterPackPurchaseForm = styled(PurchaseForm)`
  flex-basis: 320px;
  max-width: 480px;
  & > h2 {
    text-align: left;
    padding-left: 100px;
    white-space: nowrap;
  }
`;

const PackWrapper = styled.div`
  height: 350px;
  overflow: hidden auto;
  padding: 0px 8px 10px;
`;

const PackFlavor = styled.div`
  align-items: center;
  color: ${p => p.color || p.theme.colors.main};
  display: flex;
  ${p => p.smaller
    ? `
      font-size: 13px;
    `
    : `
      font-size: 14px;
    `
  }
  height: 85px;
  filter: brightness(135%);
  padding: 0 5px 0 95px;
  text-align: left;
`;

const PackContents = styled.div`
  padding: 10px 0 15px;
`;
const PackChecks = styled.div`
  margin-top: 5px;
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
    margin-bottom: 15px;
    padding-right: 4px;
    &:last-child {
      margin-bottom: 0;
    }
    & > span {
      color: ${p => p.color};
      flex: 0 0 32px;
      font-size: 12px;
      padding-top: 3px;
    }
    & > label {
      color: white;
      font-size: 13px;
      line-height: 18px;
      & > b {
        color: white;
        font-weight: normal;
        white-space: nowrap;
      }
    }
  }
`;
const Flair = styled.div`
  background: ${p => p.color || p.theme.colors.main};
  clip-path: polygon(0 0, 100% 0, 0 100%);
  font-size: 23px;
  height: 44px;
  left: 0;
  padding: 2px 3px;
  position: absolute;
  text-align: left;
  top: 0;
  width: 44px;
  z-index: 2;
`;
const FlairCard = styled.div`
  left: 5px;
  position: absolute;
  top: 5px;
  z-index: 1;
  filter: drop-shadow(2px 2px 6px black);
`;

export const StarterPack = ({ product, ...props }) => {
  const { accountAddress, login } = useSession();

  const { pendingTransactions } = useCrewContext();

  const [isPurchasing, setIsPurchasing] = useState();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  // pack
  const { color, colorLabel, checkMarks, crewmateAppearance, flairIcon, flavorText } = product.ui;

  const isPurchasingStarterPack = useMemo(() => {
    return isPurchasing || (pendingTransactions || []).find(tx => tx.key === 'PurchaseStarterPack');
  }, [isPurchasing, pendingTransactions]);

  const [isSelected, setIsSelected] = useState();
  const onSelect = useCallback(() => {
    if (!accountAddress) return login();
    setIsSelected(true);
  }, [accountAddress, login]);

  const onPurchase = useCallback(() => {

    // if (setIsPurchasing) setIsPurchasing(true);
    // createAlert({
    //   type: 'GenericAlert',
    //   data: { content: 'Insufficient ETH or USDC/ETH swap liquidity!' },
    //   level: 'warning',
    //   duration: 5000
    // });
    // if (setIsPurchasing) setIsPurchasing(false);

    // fireTrackingEvent('purchase', {
    //   category: 'purchase',
    //   currency: 'USD',
    //   externalId: accountAddress,
    //   value: Number(crewmateTally) * 5,
    //   items: [{
    //     item_name: `starter_pack_${packLabel}`
    //   }]
    // });

    // createAlert({
    //   type: 'GenericAlert',
    //   data: { content: 'Insufficient SWAY swap liquidity!' },
    //   level: 'warning',
    //   duration: 5000
    // });
  }, []);

  // NOTE: for tinkering...
  // const overwriteAppearance = useMemo(() => Crewmate.packAppearance({
  //   ...Crewmate.unpackAppearance(crewmates[pack].appearance),
  //   clothes: 18,
  // }), [pack]);
  // if (pack === 'intro') {
  //   console.log('overwriting', overwriteAppearance);
  //   crewmateProps.appearance = overwriteAppearance;
  // }

  return (
    <>
      <StarterPackPurchaseForm
        color={colorLabel}
        onClick={props.asButton ? onSelect : undefined}
        {...props}>
        <h2>
          <Flair color={color}>{flairIcon}</Flair>
          <FlairCard>
            <CrewmateCardFramed
              isCaptain
              CrewmateCardProps={{
                gradientRGB: hexToRGB(color),
                useExplicitAppearance: true
              }}
              crewmate={{
                Crewmate: {
                  appearance: crewmateAppearance,
                  class: 0,
                  coll: Crewmate.COLLECTION_IDS.ADALIAN,
                }
              }}
              width={85} />
          </FlairCard>
          {product.name} Pack
        </h2>
        <PackWrapper>
          <PackFlavor color={color} smaller={props.asButton}>{flavorText}</PackFlavor>
          <PackContents color={color}>
            <SKUHighlight color={color}>
              <BuildingIcon />
              <span style={{ marginLeft: 8 }}>{product.buildings.length} Building{product.buildings.length === 1 ? '' : 's'}</span>
            </SKUHighlight>
            <SKUHighlight color={color}>
              <CrewmateCreditIcon />
              <span style={{ marginLeft: 8 }}>{product.crewmates} Crewmate{product.crewmates === 1 ? '' : 's'}</span>
            </SKUHighlight>
          </PackContents>
          <PackChecks color={color}>
            {checkMarks.map((checkText, i) => (
              <div key={i}>
                <span><CheckIcon /></span>
                <label>{checkText}</label>
              </div>
            ))}
          </PackChecks>
        </PackWrapper>

        {!props.asButton && (
          <SKUButton
            isPurchasing={isPurchasingStarterPack}
            onClick={onSelect}
            usdcPrice={product.price * TOKEN_SCALE[TOKEN.USDC] / 100}
          />
        )}
      </StarterPackPurchaseForm>
      {isSelected && (
        <StripeCheckout
          metadata={{ account: accountAddress }}
          onClose={() => setIsSelected(false)}
          price={product.price}
          productId={product.id}
          productName={`${product.name} Pack`} />
      )}
    </>
  );
};

// TODO: wrap in launch feature flag
const StarterPackSKU = () => {
  const starterPacks = useStarterPacks();
  return (
    <div style={{ width: '100%' }}>
      <SKUTitle style={{ textAlign: 'center' }}>Choose a Starter Pack</SKUTitle>
      <StarterPacksOuter style={starterPacks.length > 2 ? {} : { justifyContent: 'space-between' }}>
        {(starterPacks || []).map((product, i) => (
          <StarterPack
            key={product.id}
            index={i}
            product={product}
            style={i > 0 ? { marginLeft: 15 } : {}} />
        ))}
      </StarterPacksOuter>
    </div>
  );
};

export default StarterPackSKU;
