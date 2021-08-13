import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

const useBuyAsteroid = () => {
  const queryClient = useQueryClient();
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

  return useMutation(async ({ i }) => {
    const price = await contract.getAsteroidPrice(i);
    const tx = await contract.buyAsteroid(i, { value: price });
    const receipt = await tx.wait();
    return receipt;
  }, {
    enabled: !!contract && !!account,
    onSuccess: (data, { i }) => {
      queryClient.invalidateQueries([ 'asteroid', i ]);
      queryClient.invalidateQueries('asteroids');
      queryClient.invalidateQueries('events');
    }
  });
};

export default useBuyAsteroid;
