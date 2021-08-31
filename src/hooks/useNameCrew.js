import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

import useStore from '~/hooks/useStore';

const useNameCrew = (i) => {
  const queryClient = useQueryClient();
  const { account, library } = useWeb3React();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ contract, setContract ] = useState();

  // Sets up contract object with appropriate provider
  useEffect(() => {
    const provider = !!account ? library.getSigner(account) : library;
    const newContract = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_CREW_NAMES,
      contracts.CrewNames,
      provider
    );

    setContract(newContract);
  }, [ account, library ]);

  return useMutation(async ({ name }) => {
    const tx = await contract.setName(i, name);
    const receipt = await tx.wait();
    return receipt;
  }, {
    enabled: !!contract && !!account,

    onError: (err, vars, context) => {
      console.error(err, i, context);
      createAlert({
        type: 'CrewMember_NamingError',
        level: 'warning',
        i: i, timestamp: Math.round(Date.now() / 1000)
      });
    },

    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries('events'), 1000);
    }
  });
};

export default useNameCrew;
