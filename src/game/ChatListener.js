import { useCallback, useEffect, useState } from 'react';

import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';

const ChatListener = () => {
  const {
    registerConnectionHandler,
    registerMessageHandler,
    unregisterConnectionHandler,
    unregisterMessageHandler,
    wsReady
  } = useWebsocket();

  const dispatchChatMessage = useStore(s => s.dispatchChatMessage);
  const dispatchChatDisconnectedMessage = useStore(s => s.dispatchChatDisconnectedMessage);
  
  // for debug:
  // const dispatchClearChatHistory = useStore(s => s.dispatchClearChatHistory);
  // useEffect(() => {
  //   dispatchClearChatHistory();
  // }, [])

  const [disconnected, setDisconnected] = useState();
  const handleWSConnection = useCallback((isOpen) => {
    setDisconnected(!isOpen);
  }, []);

  useEffect(() => {
    if (disconnected) {
      const to = setTimeout(() => {
        dispatchChatDisconnectedMessage();
      }, 1000);
      return () => {  // if reconnects before timeout, no message added
        clearInterval(to);
      }
    }
  }, [disconnected]);

  const handleWSMessage = useCallback((message) => {
    if (process.env.NODE_ENV !== 'production') console.log('onWSMessage', message);

    const { type, body } = message;
    if (type === 'chat-message-received') {
      dispatchChatMessage({
        asteroidId: body?.asteroid?.id,
        crewId: body?.from?.id,
        message: body?.message
      });
    }
  }, [dispatchChatMessage]);

  useEffect(() => {
    if (wsReady) {
      const connectionRegId = registerConnectionHandler(handleWSConnection);
      const messageRegId = registerMessageHandler(handleWSMessage);
      dispatchChatDisconnectedMessage(); // on mount, must of been disconnected previously
      return () => {
        unregisterConnectionHandler(connectionRegId);
        unregisterMessageHandler(messageRegId);
      };
    }
  }, [handleWSConnection, handleWSMessage, wsReady]);

  return null;
};

export default ChatListener;