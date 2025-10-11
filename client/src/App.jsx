import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

const computeConversationId = (firstId, secondId) => {
  const a = Math.min(firstId, secondId);
  const b = Math.max(firstId, secondId);
  const sum = a + b;
  return Math.floor(((sum) * (sum + 1)) / 2 + b);
};

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [userId, setUserId] = useState('');
  const [peerId, setPeerId] = useState('');

  const client = useMemo(() => {
    const stompClient = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host.replace('3000', '8080')}/ws-chat`,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });
    return stompClient;
  }, []);

  const numericUserId = useMemo(() => {
    const parsed = Number(userId);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }, [userId]);

  const numericPeerId = useMemo(() => {
    const parsed = Number(peerId);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }, [peerId]);

  const conversationId = useMemo(() => {
    if (numericUserId == null || numericPeerId == null) {
      return null;
    }
    return computeConversationId(numericUserId, numericPeerId);
  }, [numericPeerId, numericUserId]);

  const subscriptionRef = useRef(null);

  const handleIncomingMessage = useCallback(message => {
    const payload = JSON.parse(message.body);
    setMessages(prev => [...prev, payload]);
  }, []);

  const subscribeToConversation = useCallback(() => {
    if (!conversationId || !client.connected) {
      return;
    }
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = client.subscribe(`/topic/conversations/${conversationId}`, handleIncomingMessage);
  }, [client, conversationId, handleIncomingMessage]);

  useEffect(() => {
    client.onConnect = () => {
      setStatus('connected');
      subscribeToConversation();
    };
    client.onStompError = frame => {
      console.error('Broker error', frame.headers['message']);
      setStatus('error');
    };
    client.onWebSocketClose = () => {
      setStatus('disconnected');
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [client, subscribeToConversation]);

  useEffect(() => {
    setStatus('connecting');
    client.activate();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      client.deactivate();
    };
  }, [client]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      return;
    }

    fetch(`/api/conversations/${conversationId}/messages`)
      .then(resp => resp.ok ? resp.json() : [])
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setStatus('error'));

    if (client.connected) {
      subscribeToConversation();
    }
  }, [client, conversationId, subscribeToConversation]);

  const sendMessage = evt => {
    evt.preventDefault();
    if (!input.trim() || numericUserId == null || numericPeerId == null || !conversationId) {
      return;
    }
    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        conversationId,
        senderId: numericUserId,
        recipientId: numericPeerId,
        content: input
      })
    });
    setInput('');
  };

  return (
    <div className="app">
      <header>
        <h1>Direct Chat</h1>
        <p>Status: <span className={`status ${status}`}>{status}</span></p>
      </header>
      <section className="user-section">
        <div className="user-inputs">
          <label>
            Your User ID
            <input
              type="number"
              value={userId}
              onChange={event => setUserId(event.target.value)}
              placeholder="Enter your user id"
              min="0"
            />
          </label>
          <label>
            Chat Partner ID
            <input
              type="number"
              value={peerId}
              onChange={event => setPeerId(event.target.value)}
              placeholder="Enter the user id to chat with"
              min="0"
            />
          </label>
        </div>
        {conversationId && (
          <p className="conversation-hint">
            Conversation #{conversationId}
          </p>
        )}
      </section>
      <main>
        <ul className="messages">
          {messages.map(message => (
            <li key={message.id}>
              <span className="sender">{message.senderName}</span>
              <span className="time">{new Date(message.sentAt).toLocaleTimeString()}</span>
              <div className="content">{message.content}</div>
            </li>
          ))}
        </ul>
      </main>
      <form className="input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Type a message"
        />
        <button
          type="submit"
          disabled={numericUserId == null || numericPeerId == null || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default App;
