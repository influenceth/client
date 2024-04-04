import axios from 'axios';
import { useQuery } from 'react-query';

const useAnnotationContent = (annotation) => {
  const hash = annotation?.ipfs?.hash;
  return useQuery(
    ['annotation', hash],
    async () => {
      const response = await axios.get(`${process.env.REACT_APP_IPFS_URL}/${hash}`);
      return response?.data?.content;
    },
    { enabled: !!hash }
  )
};

export default useAnnotationContent;
