import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

const useScanAsteroid = () => {
  const queryClient = useQueryClient();
  const { account, library } = useWeb3React();
  const [ contract, setContract ] = useState();
  const [ status, setStatus ] = useState();

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

  const startScan = useMutation(async ({ i }) => {
    const tx = await contract.startScan(i);
    const receipt = await tx.wait(2);
    return receipt;
  }, {
    enabled: !!contract && !!account,
    onMutate: () => setStatus('startScanInProgress'),
    onError: (e) => {
      console.error(e);
      setStatus(null);
    },
    onSuccess: (data, { i }) => {
      console.log('started scan');
      setStatus('startScanCompleted');
      setTimeout(() => {
        queryClient.invalidateQueries([ 'asteroid', i ]);
        queryClient.invalidateQueries('asteroids');
        queryClient.invalidateQueries('events');
      }, 1000);
    }
  });

  const finalizeScan = useMutation(async ({ i }) => {
    const tx = await contract.finalizeScan(i);
    const receipt = await tx.wait();
    return receipt;
  }, {
    enabled: !!contract && !!account,
    onMutate: () => setStatus('finalizeScanInProgress'),
    onError: () => setStatus('startScanCompleted'),
    onSuccess: (data, { i }) => {
      console.log('completing scan');
      setStatus('scanComplete');
      setTimeout(() => {
        queryClient.invalidateQueries([ 'asteroid', i ]);
        queryClient.invalidateQueries('asteroids');
        queryClient.invalidateQueries('events');
      }, 1000);
    }
  });

  return { startScan, finalizeScan, status };
};

export default useScanAsteroid;
