import { useQuery } from 'react-query';
import axios from 'axios';
import { useWeb3React } from '@web3-react/core';

const useOwnedAsteroids = () => {
  // const { account } = useWeb3React();
  const account = '0x08Fd646854FDF202fE79A108a4Fe66f11C94e7a3';

  return useQuery([ 'ownedAsteroids', account ], async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids?hydrated=true&ownedBy=${account}`);
    return response.data;
  }, { enabled: !!account });
};

export default useOwnedAsteroids;
