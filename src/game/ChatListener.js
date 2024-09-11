import { useCallback, useEffect, useState } from '~/lib/react-debug';

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

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchChatMessage = useStore(s => s.dispatchChatMessage);
  const dispatchChatDisconnectedMessage = useStore(s => s.dispatchChatDisconnectedMessage);
  
  // for debug:
  // const dispatchClearChatHistory = useStore(s => s.dispatchClearChatHistory);
  // useEffect(import.meta.url, () => {
  //   dispatchClearChatHistory();
  // }, [])

  // useEffect(import.meta.url, () => {
  //   const i = setInterval(() => {
  //     dispatchChatMessage({
  //       asteroidId: 1,
  //       crewId: 1,
  //       message: `This is a test message. ${Date.now()}`
  //     })
  //   }, 10000);
  //   return () => clearInterval(i);
  // }, []);

  const [disconnected, setDisconnected] = useState();
  const handleWSConnection = useCallback(import.meta.url, (isOpen) => {
    setDisconnected(!isOpen);
  }, []);

  useEffect(import.meta.url, () => {
    if (disconnected) {
      const to = setTimeout(() => {
        dispatchChatDisconnectedMessage();
      }, 1000);
      return () => {  // if reconnects before timeout, no message added
        clearTimeout(to);
      }
    }
  }, [disconnected]);

  const handleWSMessage = useCallback(import.meta.url, (message) => {
    if (process.env.NODE_ENV !== 'production') console.log('onWSMessage (chat)', message);

    const { type, body, message: errorMessage } = message;
    if (type === 'chat-message-received') {
      dispatchChatMessage({
        asteroidId: body?.asteroid?.id,
        crewId: body?.from?.id,
        message: body?.message
      });
    } else if (type === 'send-message-failure') {
      createAlert({
        type: 'GenericAlert',
        data: { content: `Message failed to send. ${errorMessage || 'Please try again'}.` },
        duration: 3000,
        level: 'warning',
      });
    }
  }, [dispatchChatMessage]);

  useEffect(import.meta.url, () => {
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