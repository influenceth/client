import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

const useAsteroidPrice = (asteroid) => {
  const { account, library } = useWeb3React();
  const [ contract, setContract ] = useState();

  // Sets up contract object with appropriate provider
  useEffect(() => {
    if (library) {
      const provider = !!account ? library.getSigner(account) : library;
      const newContract = new ethers.Contract(
        process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
        contracts.ArvadCrewSale,
        provider
      );

      setContract(newContract);
    }
  }, [ account, library ]);

  return useQuery([ 'asteroidPrice', asteroid?.i ], async () => {
    const price = await contract.getAsteroidPrice(asteroid.i);
    return price;
  }, { enabled: !!contract && !!asteroid });
};

export default useAsteroidPrice;
