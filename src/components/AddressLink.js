import { useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import MarketplaceLink from '~/components/MarketplaceLink';
import OnClickLink from '~/components/OnClickLink';
import useAuth from '~/hooks/useAuth';

const AddressLink = (props) => {
  const { address, chain, truncate } = props;
  const { account } = useAuth();

  const label = useMemo(() => {
    return (account && account === address)
      ? 'you'
      : (
        address && truncate
        ? `${address.substr(0, 6)}...${address.substr(-4)}`
        : address
      );
  }, [account, address, truncate]);

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
            onClick={onClick}>
            {label}
          </OnClickLink>
        )}
      </MarketplaceLink>
    );
  } else {
    return <span>Un-owned</span>
  }
};

export default AddressLink;
