import React, { useEffect, useMemo, useState } from 'react';
import { Client } from '@stomp/stompjs';

const defaultConversationId = 1;

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [userId, setUserId] = useState('');

  const client = useMemo(() => {
    const stompClient = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host.replace('3000', '8080')}/ws-chat`,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });
    stompClient.onConnect = () => {
      setStatus('connected');
      stompClient.subscribe(`/topic/conversations/${defaultConversationId}`, message => {
        const payload = JSON.parse(message.body);
        setMessages(prev => [...prev, payload]);
      });
    };
    stompClient.onStompError = frame => {
      console.error('Broker error', frame.headers['message']);
      setStatus('error');
    };
    stompClient.onWebSocketClose = () => setStatus('disconnected');
    return stompClient;
  }, []);

  useEffect(() => {
    client.activate();
    fetch(`/api/conversations/${defaultConversationId}/messages`)
      .then(resp => resp.json())
      .then(data => setMessages(data))
      .catch(() => setStatus('error'));

    return () => {
      client.deactivate();
    };
  }, [client]);

  const sendMessage = evt => {
    evt.preventDefault();
    if (!input.trim() || !userId) {
      return;
    }
    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        conversationId: defaultConversationId,
        senderId: Number(userId),
        content: input
      })
    });
    setInput('');
  };

  return (
    <div className="app">
      <header>
        <h1>Team Chat</h1>
        <p>Status: <span className={`status ${status}`}>{status}</span></p>
      </header>
      <section className="user-section">
        <label>
          Your User ID
          <input
            type="number"
            value={userId}
            onChange={event => setUserId(event.target.value)}
            placeholder="Enter your assigned user id"
          />
        </label>
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
        <button type="submit" disabled={!userId || !input.trim()}>Send</button>
      </form>
    </div>
  );
};

export default App;
