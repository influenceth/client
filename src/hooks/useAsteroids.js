import { useQuery } from 'react-query';
import axios from 'axios';

const useAsteroids = () => {
  return useQuery('asteroids', async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/asteroids`);
    return response.data;
  });
};

export default useAsteroids;
