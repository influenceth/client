import { useMemo } from 'react';
import { Address } from '@influenceth/sdk';

import MarketplaceLink from '~/components/MarketplaceLink';
import OnClickLink from '~/components/OnClickLink';
import useSession from '~/hooks/useSession';

const AddressLink = (props) => {
  const { address, chain, truncate } = props;
  const { accountAddress } = useSession();

  const label = useMemo(() => {
    return (accountAddress && accountAddress === address)
      ? 'you'
      : (
        address && truncate
        ? `${address.substr(0, 6)}...${address.substr(-4)}`
        : address
      );
  }, [accountAddress, address, truncate]);

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
