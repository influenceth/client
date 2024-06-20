require('dotenv').config({ silent: true });
const axios = require('axios');

(() => {
  try {
    if (process.env.WAF_CACHE_BUST) axios.post(process.env.WAF_CACHE_BUST, {});
  } catch (error) {
    console.error(error);
  }
})();