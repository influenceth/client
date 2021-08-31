import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

import useStore from '~/hooks/useStore';

const useStartAsteroidScan = (i) => {
  const queryClient = useQueryClient();
  const { account, library } = useWeb3React();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ contract, setContract ] = useState();

  // Sets up contract object with appropriate provider
  useEffect(() => {
    const provider = !!account ? library.getSigner(account) : library;
    const newContract = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
      contracts.AsteroidScans,
      provider
    );

    setContract(newContract);
  }, [ account, library ]);

  return useMutation(async () => {
    const tx = await contract.startScan(i);
    const receipt = await tx.wait(3);
    return receipt;
  }, {
    enabled: !!contract && !!account,

    onError: (err, vars, context) => {
      console.error(err, i, context);
      createAlert({
        type: 'Asteroid_ScanningError',
        level: 'warning',
        i: i,
        timestamp: Math.round(Date.now() / 1000)
      });
    },

    onSuccess: () => {
      setTimeout(() => {
        createAlert({
          type: 'Asteroid_ReadyToFinalizeScan',
          i: i,
          timestamp: Math.round(Date.now() / 1000)
        });

        queryClient.invalidateQueries('events');
      }, 1000);
    }
  });
};

export default useStartAsteroidScan;
