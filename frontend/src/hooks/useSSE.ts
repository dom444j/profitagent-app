import { useState, useEffect, useRef } from 'react';
import { SSEEvent } from '../types';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const useSSE = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = async () => {
    try {
      const eventSource = await apiService.createSSEConnection();
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            type: data.type,
            data: data.data,
            timestamp: data.timestamp || new Date().toISOString(),
          };
          
          setLastEvent(sseEvent);
          setEvents(prev => [...prev.slice(-49), sseEvent]); // Keep last 50 events
          
          console.log('SSE event received:', sseEvent);
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnected(false);
        
        // Attempt to reconnect after 5 seconds, only if still authenticated
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) {
            console.log('Attempting to reconnect SSE...');
            connect();
          }
        }, 5000);
      };

      eventSource.addEventListener('close', () => {
        console.log('SSE connection closed');
        setConnected(false);
      });

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnected(false);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setConnected(false);
  };

  // Manage connection lifecycle based on auth state
  useEffect(() => {
    if (user && !connected && !eventSourceRef.current) {
      connect();
    }
    if (!user) {
      disconnect();
    }
    // Cleanup on unmount
    return () => {
      // no-op here; main cleanup handled by disconnect
    };
  }, [user]);

  return {
    connected,
    lastEvent,
    events,
    connect,
    disconnect,
  };
};