import { Address } from '@influenceth/sdk';

import MarketplaceLink from '~/components/MarketplaceLink';
import OnClickLink from '~/components/OnClickLink';
import useAccountFormatted from '~/hooks/useAccountFormatted';

const AddressLink = (props) => {
  const { address, chain, doNotReplaceYou, truncate, doNotUseName } = props;

  const label = useAccountFormatted({ address, doNotReplaceYou, doNotUseName, truncate });

  if (address) {
    return (
      <MarketplaceLink
        chain={(chain || Address.getChain(address)).toUpperCase()}
        assetType="account"
        id={address}>
        {(onClick, setRefEl) => (
          <OnClickLink
            ref={setRefEl}
            maxWidth={props.maxWidth}
            onClick={onClick}
            {...props}>
            {props.children || label}
          </OnClickLink>
        )}
      </MarketplaceLink>
    );
  } else {
    return <span>Un-owned</span>
  }
};

export default AddressLink;
