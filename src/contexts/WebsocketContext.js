import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import useSession from '~/hooks/useSession';

const WebsocketContext = createContext();

const DEFAULT_ROOM = '_';

// NOTE: could maybe roll this back into ActivitiesContext if there was a reason to combine them
export function WebsocketProvider({ children }) {
  const { token } = useSession();

  const socket = useRef();
  const registeredHandlers = useRef({});

  const [wsReady, setWsReady] = useState(false);

  const handleMessage = useCallback((messageLabel, payload) => {
    // NOTES:
    // - messageLabel can be "event" or "NameChanged" or anything... we do not use the value currently
    // - payload also contains type, most of which are ignored (i.e. CURRENT_STARKNET_BLOCK_NUMBER, ActionItem, etc.)
    // - for all but CURRENT_STARKNET_BLOCK_NUMBER, body contains { event }
    const { type, body, room } = payload;

    if (type !== 'CURRENT_STARKNET_BLOCK_NUMBER') {
      body.id = body.event.id;  // TODO: this is a hack to make it look like an activity
    }

    const roomKey = (room || '').includes('::') ? room : DEFAULT_ROOM;
    if (registeredHandlers.current[roomKey]) {
      if (process.env.NODE_ENV !== 'production') console.log('handleMessage', roomKey, { type, body });
      registeredHandlers.current[roomKey]({ type, body });
    }
  }, []);

  // NOTE: this is currently limited to one callback registered per room b/c that's
  //  all we need, but it could always be switched to an array of listeners if needed
  const registerWSHandler = useCallback((callback, room = null) => {
    if (!socket.current) return;
    if (room) {
      const [type, id] = room.split('::');
      if (type && id) {
        socket.current.emit('join-room-request', { type, id: Number(id) });
        registeredHandlers.current[room] = callback;
      } else {
        console.error('Invalid websocket room! (join)', room);
      }
    } else {
      registeredHandlers.current[DEFAULT_ROOM] = callback;
    }
  }, []);

  const unregisterWSHandler = useCallback((room) => {
    if (!socket.current) return;
    if (room) {
      const [type, id] = room.split('::');
      if (type && id) {
        socket.current.emit('leave-room-request', { type, id: Number(id) });
        delete registeredHandlers.current[room];
      } else {
        console.error('Invalid websocket room! (leave)', room);
      }
    } else {
      delete registeredHandlers.current[DEFAULT_ROOM];
    }
  }, []);

  useEffect(() => {
    if (token) {
      socket.current = new io(process.env.REACT_APP_API_URL, {
        transports: [ 'websocket' ],
        query: `token=${token}`
      });
      socket.current.onAny(handleMessage);
      setWsReady(true);
    }
    return () => {
      if (socket.current) {
        socket.current.off(); // removes all listeners for all events
        socket.current.disconnect();
      }
      setWsReady(false);
    }
  }, [token]);

  return (
    <WebsocketContext.Provider value={{
      registerWSHandler,
      unregisterWSHandler,
      wsReady
    }}>
      {children}
    </WebsocketContext.Provider>
  );
}

export default WebsocketContext;