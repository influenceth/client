import { useEffect, useState } from 'react';

import { useWeb3React } from '@web3-react/core';

const AddressLink = (props) => {
  const { address } = props;
  const { account } = useWeb3React();
  const [ text, setText ] = useState(address);
  const url = `${process.env.REACT_APP_OPEN_SEA_URL}/accounts/${address}`;

  useEffect(() => {
    if (account && account === address) setText('you');
  }, [ account, address ]);

  if (address) {
    return <a target="_blank" rel="noreferrer" href={url}>{text}</a>;
  } else {
    return <span>Un-owned</span>
  }
};

export default AddressLink;
