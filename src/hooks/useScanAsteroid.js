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
      setStatus('startScanCompleted');
      queryClient.invalidateQueries([ 'asteroid', i ]);
      queryClient.invalidateQueries('asteroids');
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
      setStatus('scanComplete');
      queryClient.invalidateQueries([ 'asteroid', i ]);
      queryClient.invalidateQueries('asteroids');
    }
  });

  return { startScan, finalizeScan, status };
};

export default useScanAsteroid;
