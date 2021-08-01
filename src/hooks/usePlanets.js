import { useQuery } from 'react-query';

import api from '~/lib/api';

const usePlanets = () => useQuery('planets', api.getPlanets);

export default usePlanets;
