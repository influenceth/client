import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { contracts } from 'influence-utils';

import useStore from '~/hooks/useStore';

const useNameAsteroid = () => {
  const queryClient = useQueryClient();
  const { account, library } = useWeb3React();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const [ contract, setContract ] = useState();

  // Sets up contract object with appropriate provider
  useEffect(() => {
    const provider = !!account ? library.getSigner(account) : library;
    const newContract = new ethers.Contract(
      process.env.REACT_APP_CONTRACT_ASTEROID_NAMES,
      contracts.AsteroidNames,
      provider
    );

    setContract(newContract);
  }, [ account, library ]);

  return useMutation(async ({ i, name }) => {
    const tx = await contract.setName(i, name);
    const receipt = await tx.wait();
    return receipt;
  }, {
    enabled: !!contract && !!account,

    onMutate: async ({ i, name }) => {
      await queryClient.cancelQueries([ 'asteroid', i ]);
      const previousAsteroid = queryClient.getQueryData([ 'asteroid', i ]);
      queryClient.setQueryData([ 'asteroid', i ], old => {
        return {
          ...old,
          customName: name,
          name: `${old.baseName} '${name}'`
        }
      });

      return { previousAsteroid };
    },

    onError: (err, { i }, context) => {
      console.error(err, i, context);
      createAlert({ type: 'Asteroid_NamingError', i: i, timestamp: Math.round(Date.now() / 1000) });
      queryClient.setQueryData([ 'asteroid', i ], context.previousAsteroid);
      queryClient.invalidateQueries([ 'asteroid', i ]);
    },

    onSuccess: (data, { i }) => {
      setTimeout(() => {
        queryClient.invalidateQueries([ 'asteroid', i ]);
        queryClient.invalidateQueries('asteroids');
        queryClient.invalidateQueries('events');
      }, 1000);
    }
  });
};

export default useNameAsteroid;
