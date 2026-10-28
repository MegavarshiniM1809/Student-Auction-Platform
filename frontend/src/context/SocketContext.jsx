import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    if (user?._id) {
      socket.emit('join_user', user._id);
    }

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  const joinAuction = (auctionId) => {
    socketRef.current?.emit('join_auction', auctionId);
  };

  const leaveAuction = (auctionId) => {
    socketRef.current?.emit('leave_auction', auctionId);
  };

  const on = (event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  };

  const off = (event, handler) => {
    socketRef.current?.off(event, handler);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinAuction, leaveAuction, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
