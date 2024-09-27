import styled from 'styled-components';

import BrightButton from '~/components/BrightButton';
import { ChevronRightIcon } from '~/components/Icons';
import SwayPrice from '~/components/SwayPrice';
import UserPrice from '~/components/UserPrice';
import useCrewContext from '~/hooks/useCrewContext';
import { TOKEN, TOKEN_FORMAT } from '~/lib/priceUtils';
import { nativeBool, reactBool } from '~/lib/utils';

const PurchaseButtonInner = styled.div`
  & > svg:last-child {
    position: absolute;
    right: 8px;
    top: 0;
    height: 100%;
    display: flex;
    font-size: 20px;
  }
`;

const SKUButton = ({ usdcPrice, onClick, isPurchasing, isSway, ...props }) => {
  const { isLaunched } = useCrewContext();
  return (
    <BrightButton
      disabled={nativeBool(isPurchasing || !isLaunched)}
      loading={reactBool(isPurchasing)}
      onClick={onClick}
      {...props}>
      <PurchaseButtonInner>
        Purchase{usdcPrice && `: `}
        {usdcPrice && (
          isSway
            ? (
              <SwayPrice
                price={usdcPrice}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
            )
            : (
              <UserPrice
                price={usdcPrice}
                priceToken={TOKEN.USDC}
                format={TOKEN_FORMAT.SHORT} />
            )
          )
        }
        <ChevronRightIcon />
      </PurchaseButtonInner>
    </BrightButton>
  );
}

export default SKUButton;