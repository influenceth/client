import { useEffect, useState } from 'react';

import useAuth from '~/hooks/useAuth';

const AddressLink = (props) => {
  const { address } = props;
  const { account } = useAuth();
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
