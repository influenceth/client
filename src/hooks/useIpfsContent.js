import axios from 'axios';
import { useQuery } from 'react-query';

import { appConfig } from '~/appConfig';

const useIpfsContent = (hash) => {
  return useQuery(
    ['annotation', hash],
    async () => {
      const response = await axios.get(`${appConfig.get('Api.ipfs')}/${hash}`);
      return response?.data?.content;
    },
    { enabled: !!hash }
  )
};

export default useIpfsContent;
