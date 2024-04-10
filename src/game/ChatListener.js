import { useCallback, useEffect } from 'react';

import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';

const ChatListener = () => {
  const { registerWSHandler, unregisterWSHandler, wsReady } = useWebsocket();

  const dispatchChatMessage = useStore(s => s.dispatchChatMessage);

  const handleWSMessage = useCallback((message) => {
    if (process.env.NODE_ENV !== 'production') console.log('onWSMessage', message);

    const { type, body } = message;
    dispatchChatMessage(body);
  }, [dispatchChatMessage]);

  useEffect(() => {
    if (wsReady) {
      let roomName = `Chat`;
      registerWSHandler(handleWSMessage, roomName);
      return () => {
        handleWSMessage({ disconnection: true });
        unregisterWSHandler(roomName);
      };
    }
  }, [wsReady]);
};

export default ChatListener;