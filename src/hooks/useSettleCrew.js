import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

import useStore from '~/hooks/useStore';

const useSettleCrew = (i) => {
  const queryClient = useQueryClient();
  const { account, library } = useWeb3React();
  const createAlert = useStore(s => s.dispatchAlertLogged);
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

  return useMutation(async () => {
    const tx = await contract.mintCrewWithAsteroid(i);
    const receipt = await tx.wait();
    return receipt;
  }, {
    enabled: !!contract && !!account,

    onError: (err, vars, context) => {
      console.error(err, i, context);
      createAlert({
        type: 'CrewMember_SettlingError',
        level: 'warning',
        i: i,
        timestamp: Math.round(Date.now() / 1000)
      });
    },

    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries('assignments');
        queryClient.invalidateQueries('events');
      }, 1000);
    }
  });
};

export default useSettleCrew;
