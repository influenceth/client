import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

const useAsteroidPrice = (i) => {
  const { account, library } = useWeb3React();
  const [ contract, setContract ] = useState();

  // Sets up contract object with appropriate provider
  useEffect(() => {
    const provider = !!account ? library.getSigner(account) : library;
    const newContract = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
      contracts.ArvadCrewSale,
      provider
    );

    setContract(newContract);
  }, [ account, library ]);

  return useQuery([ 'asteroidPrice', i ], async () => {
    const price = await contract.getAsteroidPrice(i);
    return price;
  }, { enabled: !!contract });
};

export default useAsteroidPrice;
