import React, { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import useAuth from '~/hooks/useAuth';

const WebsocketContext = React.createContext();

const DEFAULT_ROOM = '_';

// NOTE: could maybe roll this back into EventsContext if there was a reason to combine them
export function WebsocketProvider({ children }) {
  const { token, account } = useAuth();
  
  const socket = useRef();
  const registeredHandlers = useRef({});

  const handleMessage = useCallback(({ room, ...message }) => {
    const roomKey = (room || '').includes('::') ? room : DEFAULT_ROOM;
    // console.log(room, roomKey, message);
    if (registeredHandlers.current[roomKey]) {
      registeredHandlers.current[roomKey](message);
    }
  }, []);
  
  // NOTE: this is currently limited to one registrant per room b/c that's all we need
  //  but it could definitely be increased later
  const registerWSHandler = useCallback((callback, room = null) => {
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
  });

  useEffect(() => {
    if (token) {
      socket.current = new io(process.env.REACT_APP_API_URL, {
        extraHeaders: { Authorization: `Bearer ${token}` }
      });
      socket.current.on('event', handleMessage);
    }
    return () => {
      if (socket.current) {
        socket.current.off(); // removes all listeners for all events
        socket.current.disconnect();
      }
    }
  }, [token]);

  return (
    <WebsocketContext.Provider value={{
      registerWSHandler,
      unregisterWSHandler
    }}>
      {children}
    </WebsocketContext.Provider>
  );
}

export default WebsocketContext;