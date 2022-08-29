import { useEffect, useState } from 'react';

import MarketplaceLink from '~/components/MarketplaceLink';
import OnClickLink from '~/components/OnClickLink';
import useAuth from '~/hooks/useAuth';

const AddressLink = (props) => {
  const { address, chain } = props;
  const { account } = useAuth();
  const [ text, setText ] = useState(address);

  useEffect(() => {
    if (account && account === address) setText('you');
  }, [ account, address ]);

  if (address) {
    return (
      <MarketplaceLink
        chain={chain.toUpperCase()}
        assetType="account"
        id={address}>
        {(onClick, setRefEl) => (
          <OnClickLink
            ref={setRefEl}
            maxWidth={props.maxWidth}
            onClick={onClick}>
            {text}
          </OnClickLink>
        )}
      </MarketplaceLink>
    );
  } else {
    return <span>Un-owned</span>
  }
};

export default AddressLink;
