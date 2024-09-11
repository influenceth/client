import { useContext } from '~/lib/react-debug';

import WebsocketContext from '~/contexts/WebsocketContext';

const useWebsocket = () => {
  return useContext(WebsocketContext);
};

export default useWebsocket;
