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
  const [peerId, setPeerId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loginUserId, setLoginUserId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const client = useMemo(() => {
    const stompClient = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host.replace('3000', '8080')}/ws-chat`,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });
    return stompClient;
  }, []);

  const numericUserId = currentUser?.userId ?? currentUser?.id ?? null;

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

  const resetAuthForm = useCallback(() => {
    setLoginUserId('');
    setPassword('');
    setDisplayName('');
    setAuthError(null);
    setIsSubmitting(false);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setMessages([]);
    setPeerId('');
    resetAuthForm();
  }, [resetAuthForm]);

  const handleAuthSubmit = useCallback(async (event) => {
    event.preventDefault();
    setAuthError(null);
    if (!loginUserId || !password) {
      setAuthError('User ID and password are required.');
      return;
    }

    const userIdValue = Number(loginUserId);
    if (!Number.isInteger(userIdValue) || userIdValue < 0) {
      setAuthError('User ID must be a non-negative integer.');
      return;
    }

    setIsSubmitting(true);
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = {
      userId: userIdValue,
      password
    };

    if (authMode === 'register') {
      payload.displayName = displayName || undefined;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to authenticate.');
      }

      const data = await response.json();
      const normalizedUser = {
        id: data.userId,
        userId: data.userId,
        username: data.username,
        displayName: data.displayName
      };

      setCurrentUser(normalizedUser);
      setPeerId('');
      setMessages([]);
      setAuthMode('login');
      resetAuthForm();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [authMode, displayName, loginUserId, password, resetAuthForm]);

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

      {!currentUser ? (
        <section className="auth-card">
          <h2>{authMode === 'login' ? 'Sign in' : 'Create an account'}</h2>
          <form onSubmit={handleAuthSubmit}>
            <label>
              User ID
              <input
                type="number"
                value={loginUserId}
                onChange={event => setLoginUserId(event.target.value)}
                placeholder="Enter your numeric user id"
                min="0"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
            </label>
            {authMode === 'register' && (
              <label>
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  placeholder="How others should see you"
                />
              </label>
            )}
            {authError && <p className="error">{authError}</p>}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Register'}
            </button>
          </form>
          <p className="auth-switch">
            {authMode === 'login' ? (
              <>
                Need an account?{' '}
                <button type="button" onClick={() => { setAuthMode('register'); setAuthError(null); }}>
                  Register here
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); }}>
                  Go to sign in
                </button>
              </>
            )}
          </p>
        </section>
      ) : (
        <>
          <section className="user-section">
            <div className="user-info">
              <div>
                <span className="label">Signed in as</span>
                <strong>{currentUser.displayName}</strong>
                <span className="hint">ID #{currentUser.userId ?? currentUser.id}</span>
              </div>
              <button type="button" onClick={logout} className="secondary">Log out</button>
            </div>
            <div className="user-inputs">
              <label>
                Chat partner ID
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
                <li key={message.id} className={message.senderId === numericUserId ? 'mine' : ''}>
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
              placeholder={numericPeerId == null ? 'Select a partner to start chatting' : 'Type a message'}
              disabled={numericPeerId == null}
            />
            <button
              type="submit"
              disabled={numericUserId == null || numericPeerId == null || !input.trim()}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default App;
