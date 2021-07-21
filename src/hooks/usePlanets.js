import { useQuery } from 'react-query';
import axios from 'axios';

const usePlanets = () => {
  return useQuery('planets', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/planets`);
    return response.data;
  });
};

export default usePlanets;
