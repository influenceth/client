import axios from 'axios';

const api = {

  getAsteroid: async (i) => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids/${i}`);
    return response.data;
  },

  getAsteroids: async (query) => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/asteroids`, { params: query });
    return response.data;
  },

  getPlanets: async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/planets`);
    return response.data;
  },

  getSale: async () => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/sales`);
    return response.data[0];
  },

  requestLogin: async (account) => {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/auth/login/${account}`);
    return response.data.message;
  },

  verifyLogin: async (account, signature) => {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/v1/auth/login/${account}`,
      { sig: signature }
    );

    return response.data.token;
  }
};

export default api;
