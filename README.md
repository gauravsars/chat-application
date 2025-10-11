# Chat Application

Solution Provided For Below Business/User Requirement :

Login To Chat System

1. Open the React app (e.g. npm run dev → http://localhost:3000).
   
<img width="398" height="245" alt="image" src="https://github.com/user-attachments/assets/9dce07fd-88f7-4f65-8237-34315b8cb2e3" />


Registration For New User

<img width="397" height="278" alt="image" src="https://github.com/user-attachments/assets/2f89c4cf-2adb-40cc-8f97-86e75aa6589f" />


2. After authentication, enter the user ID you want to chat with in the Chat partner ID field. One To One chat (Till last one month) with Particular selected UserID

3. Both user browsers, fetch the existing chat history, and subscribe to /topic/conversations/{conversationId}  [ompute the same deterministic conversation id using the two IDs]
   
userID : 3

<img width="416" height="463" alt="image" src="https://github.com/user-attachments/assets/de922f1f-0266-4eca-9373-9c58881a99d7" />

userID : 4

<img width="295" height="347" alt="image" src="https://github.com/user-attachments/assets/818d4713-33ba-495a-a386-17be009c9c24" />






## Architecture Overview

For 1000 to 10000 users with 10k-20k messages per day single web socket server is more then sufficient which is the scope of this chat application. 

[React SPA]  --HTTP/WebSocket-->  [Spring Boot API + STOMP broker]  --JPA-->  [PostgreSQL] [users, conversations, conversations_partner , messages, archived_messages]
                                          |
                                          +--> Nginx (reverse proxy / load balancer)  [If required can be plugged] For users  >  10000 (Nginx not required)
```

* **Backend:** Spring Boot 3, exposing REST endpoints for history and STOMP over WebSocket for live chat.
* **Frontend:** React 18 single-page app bootstrapped with Vite.
* **Database:** PostgreSQL with normalized tables for `users`, `conversations`, `conversation_participants`, and `messages` and archived_messages [ single db is sufficient for 10k users ]
* **WebSocket:** A single STOMP endpoint (`/ws-chat`) handles all socket connections;
* **Load Balancing:** An example Nginx configuration is provided m but not required for the current scope.

## Backend (Spring Boot)

Located in [`server/`](server/). Key features:

* Entities for users, conversations, and messages with normalized relationships.
* REST endpoint to fetch conversation history (`/api/conversations/{id}/messages`).
* Authentication endpoints for registering (`POST /api/auth/register`) and logging in (`POST /api/auth/login`) users with numeric IDs and passwords.
* WebSocket controller that persists incoming messages, ensures both participants already exist, and broadcasts them to subscribers via `/topic/conversations/{id}`.
* Actuator endpoints enabled for health checks in a load-balanced environment.

### Configure PostgreSQL

1. **Start PostgreSQL** – ensure a PostgreSQL server is running. A quick local option is Docker:

   ```bash
   docker run --name chat-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
   ```

2. **Create database & user** – connect with `psql` (or any SQL client) and create a dedicated database and login role:

   ```sql
   CREATE DATABASE chatapp;
   CREATE USER chatapp WITH PASSWORD 'secret';
   GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatapp;
   ```

3. **Update credentials** – either adjust [`server/src/main/resources/application.properties`](server/src/main/resources/application.properties) or override them with environment variables when running the Spring Boot app:

   ```bash
   export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/chatapp
   export SPRING_DATASOURCE_USERNAME=chatapp
   export SPRING_DATASOURCE_PASSWORD=secret
   ```

   If your PostgreSQL instance requires SSL or a non-default schema, append the relevant JDBC parameters (e.g. `?sslmode=require`).

### Run locally

```bash
cd server
./mvnw spring-boot:run
```

Configure `spring.datasource.*` properties to point to your PostgreSQL instance before running.

### Authentication Flow

1. **Register** – send `POST /api/auth/register` with a numeric `userId`, `password`, and optional `displayName`. Passwords are stored using BCrypt hashing.
2. **Login** – send `POST /api/auth/login` with the same `userId`/`password` pair to retrieve the user profile for the session.
3. **Messaging** – only authenticated users can publish chat messages; the backend rejects WebSocket payloads from unknown user IDs to avoid creating accounts implicitly.

## Frontend (React + Vite)

Located in [`client/`](client/). The SPA provides a login/registration screen, connects to the WebSocket endpoint, and streams messages for whichever two user IDs you select after signing in.

Run locally:

```bash
cd client
npm install
npm run dev
```

The development server proxies API calls to `http://localhost:8080` and expects the WebSocket endpoint at `ws://localhost:8080/ws-chat`.

### Starting a direct conversation

1. Open the React app (e.g. `npm run dev` → http://localhost:3000).
2. Register a new account or sign in with an existing numeric user ID and password.
3. After authentication, enter the user ID you want to chat with in the **Chat partner ID** field. Both browsers compute the same deterministic conversation id using the two IDs, fetch the existing history, and subscribe to `/topic/conversations/{conversationId}`.
4. Send a message—if the conversation does not exist yet, the backend creates it the first time either participant posts and links both existing users.

> Conversation identifiers use the [Cantor pairing function](https://en.wikipedia.org/wiki/Pairing_function#Cantor_pairing_function): `((a + b) * (a + b + 1)) / 2 + max(a, b)` where `a` and `b` are the two user IDs. This guarantees both parties derive the same conversation topic regardless of who starts the chat.

## Database Schema

| Table | Columns |
| ----- | ------- |
| `users` | `id` (PK), `username` (unique), `display_name`, `password_hash` |
| `conversations` | `id` (PK), `title`, `created_at` |
| `conversation_participants` | `conversation_id` (FK), `user_id` (FK) |
| `messages` | `id` (PK), `conversation_id` (FK), `sender_id` (FK), `content`, `sent_at` |

The schema ensures third normal form by separating user identities, conversation metadata, and messages, while using a junction table for participants.


## Scaling Considerations

Introduction of load balancer for directing traffic to multiple web socket server nodes 

<img width="629" height="278" alt="image" src="https://github.com/user-attachments/assets/9dd8917c-1305-4538-a2aa-40c08e47c223" />



## Sample Nginx Configuration

```nginx
upstream chat_backend {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name chat.example.com;

    location /ws-chat {
        proxy_pass http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://chat_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```



* Enable sticky sessions in the load balancer if you scale the Spring Boot nodes horizontally, or externalize the STOMP broker (e.g., RabbitMQ) for full statelessness.
* Tune `spring.datasource.hikari.maximum-pool-size` to accommodate database load for 1,000 users.



