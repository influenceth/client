import { useContext } from 'react';

import WebsocketContext from '~/contexts/WebsocketContext';

const useWebsocket = () => {
  return useContext(WebsocketContext);
};

export default useWebsocket;
