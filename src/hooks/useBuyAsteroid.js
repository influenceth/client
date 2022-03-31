import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

import useStore from '~/hooks/useStore';
import useSale from '~/hooks/useSale';

const useBuyAsteroid = (i) => {
  const queryClient = useQueryClient();
  const { account, library } = useWeb3React();
  const [ contract, setContract ] = useState();
  const { data: sale } = useSale();
  const createAlert = useStore(s => s.dispatchAlertLogged);

  // Sets up contract object with appropriate provider
  useEffect(() => {
    const provider = !!account ? library.getSigner(account) : library;
    let address = process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE;
    let contract = contracts.ArvadCrewSale;

    // Uses the first sale to support testnet usage
    if (!sale.endCount) {
      address = process.env.REACT_APP_CONTRACT_ASTEROID_SALE;
      contract = contracts.AsteroidSale;
    }

    const newContract = new ethers.Contract(address, contract, provider);
    setContract(newContract);
  }, [ account, library ]);

  return useMutation(async () => {
    const price = await contract.getAsteroidPrice(i);
    const tx = await contract.buyAsteroid(i, { value: price });
    const receipt = await tx.wait();
    return receipt;
  }, {
    enabled: !!contract && !!account,

    onError: (err, vars, context) => {
      console.error(err, i, context);
      createAlert({
        type: 'Asteroid_BuyingError',
        level: 'warning',
        i: i, timestamp: Math.round(Date.now() / 1000)
      });
    },

    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries('events'), 1000);
    }
  });
};

export default useBuyAsteroid;
