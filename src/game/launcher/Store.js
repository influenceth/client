import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import ClipCorner from '~/components/ClipCorner';
import CrewCardFramed from '~/components/CrewCardFramed';
import Ether from '~/components/Ether';
import { PlusIcon } from '~/components/Icons';
import TextInput from '~/components/TextInput';
import UncontrolledTextInput, { safeValue } from '~/components/TextInputUncontrolled';
import useCrewManager from '~/hooks/useCrewManager';
import usePriceConstants from '~/hooks/usePriceConstants';
import formatters from '~/lib/formatters';
import { boolAttr } from '~/lib/utils';
import theme from '~/theme';

const borderColor = `rgba(${theme.colors.mainRGB}, 0.5)`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  justify-content: center;
  width: 100%;
`;

const Group = styled.div`
  flex: 0 1 360px;
`;
const GroupTitle = styled.div`
  border-bottom: 1px solid #333;
  color: white;
  font-size: 20px;
  margin-bottom: 10px;
  padding-bottom: 15px;
  text-transform: uppercase;
`;
const SKUWrapper = styled.div`
  background: black;
  padding: 20px 15px;
`;
const innerPadding = 10;
const SKUInner = styled.div`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  border: 1px solid ${borderColor};
  padding: ${innerPadding}px;
  position: relative;
  ${p => p.theme.clipCorner(10)};

`;
const Title = styled.div`
  font-size: 28px;
  margin: 5px 0 15px;
  text-align: center;
  text-transform: uppercase;
`;
const Imagery = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 10px 20px;
  & > div {
    box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.33);
  }
`;
const TypeLabel = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 15px;
`;
const Main = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: space-between;
  margin: 10px -${innerPadding}px;
  padding: ${innerPadding}px;
  & > input {
    font-size: 18px;
    height: 30px;
    width: 75px;
  }
  & > label {
    font-size: 20px;
  }
`;
const Description = styled(TypeLabel)`
  padding: 5px 5px 15px 0;
`;
const Price = styled.div`
  color: white;
  font-size: 30px;
  margin-bottom: 15px;
  & label {
    font-size: 60%;
    opacity: 0.5;
    margin-left: 6px;
    text-transform: uppercase;
  }
`;
const Footnote = styled.div`
  font-size: 15px;
  opacity: 0.6;
  padding: 20px 30px 0;
  text-align: center;
`;

const CrewmateSKU = () => {
  const { purchaseCredits, getPendingCreditPurchase } = useCrewManager();
  const { data: priceConstants } = usePriceConstants();
  const [tally, setTally] = useState(1);

  const onPurchaseCrewmates = useCallback(() => {
    purchaseCredits(tally);
  }, [tally]);

  const isPendingPurchase = useMemo(() => {
    return !!getPendingCreditPurchase();
  }, [getPendingCreditPurchase]);

  return (
    <SKUWrapper>
      <SKUInner>
        <Title>Crewmate</Title>
        <Imagery>
          <CrewCardFramed
            borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
            crewmate={null}
            noAnimation
            noArrow
            silhouetteOverlay={{
              alwaysOn: ['icon'],
              disableHover: true,
              icon: <PlusIcon />,
              iconSize: 85,
              rgb: theme.colors.mainRGB,
            }}
            width={135} />
        </Imagery>
        <TypeLabel>Direct Purchase</TypeLabel>
        <Main>
          <UncontrolledTextInput
            disabled={boolAttr(isPendingPurchase)}
            min={1}
            onChange={(e) => setTally(e.currentTarget.value)}
            value={safeValue(tally)}
            step={1}
            type="number" />

          <label>Crewmates</label>
        </Main>
        <Description>
          Crewmates are purchased directly from Unstoppable Games to fund ongoing game development.
        </Description>
        <Price>
          <span>{formatters.crewmatePrice(priceConstants, 4)}</span>
          <label>Eth each</label>
        </Price>
        <Button
          loading={boolAttr(isPendingPurchase)}
          disabled={boolAttr(isPendingPurchase)}
          isTransaction
          onClick={onPurchaseCrewmates}
          subtle
          style={{ width: '100%' }}>
          Buy Directly
          {priceConstants && (
            <span style={{ color: 'white', flex: 1, fontSize: '90%', textAlign: 'right', marginLeft: 15 }}>
              {/* TODO: should this update price before "approve"? what about asteroids? */}
              <Ether>{formatters.ethPrice(BigInt(tally) * BigInt(priceConstants.ADALIAN_PRICE_ETH), 4)}</Ether>
            </span>
          )}
        </Button>
        <ClipCorner dimension={10} color={borderColor} />
      </SKUInner>
      <Footnote>Individual workers that perform all game tasks.</Footnote>
    </SKUWrapper>
  );
};

const Store = () => {
  return (
    <Wrapper>
      <Group>
        <GroupTitle>Individual Crewmates</GroupTitle>
        <CrewmateSKU />
      </Group>
    </Wrapper>
  );
};

export default Store;