import { useQuery } from 'react-query';
import axios from 'axios';

const useSale = () => {
  return useQuery('sale', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/sales`);
    return response.data[0];
  });
};

export default useSale;
