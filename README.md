# Chat Application

A full-stack chat application designed for 1,000 concurrent web users. The backend is powered by Spring Boot with PostgreSQL and Hibernate, while the frontend uses React and Vite. Real-time messaging is handled over a single WebSocket (STOMP) server that can sit behind an Nginx load balancer.

## Architecture Overview

```
[React SPA]  --HTTP/WebSocket-->  [Spring Boot API + STOMP broker]  --JPA-->  [PostgreSQL]
                                          |
                                          +--> Nginx (reverse proxy / load balancer)
```

* **Backend:** Spring Boot 3, exposing REST endpoints for history and STOMP over WebSocket for live chat.
* **Frontend:** React 18 single-page app bootstrapped with Vite.
* **Database:** PostgreSQL with normalized tables for `users`, `conversations`, `conversation_participants`, and `messages`.
* **WebSocket:** A single STOMP endpoint (`/ws-chat`) handles all socket connections; messages are routed to topic destinations per conversation.
* **Load Balancing:** An example Nginx configuration is provided below to route HTTP and WebSocket traffic to the Spring Boot service.

## Backend (Spring Boot)

Located in [`server/`](server/). Key features:

* Entities for users, conversations, and messages with normalized relationships.
* REST endpoint to fetch conversation history (`/api/conversations/{id}/messages`).
* WebSocket controller that persists incoming messages and broadcasts them to subscribers via `/topic/conversations/{id}`.
* Actuator endpoints enabled for health checks in a load-balanced environment.

Run locally:

```bash
cd server
./mvnw spring-boot:run
```

Configure `spring.datasource.*` properties to point to your PostgreSQL instance before running.

## Frontend (React + Vite)

Located in [`client/`](client/). The SPA connects to the WebSocket endpoint and streams messages for a default conversation. Update the conversation and user IDs as needed.

Run locally:

```bash
cd client
npm install
npm run dev
```

The development server proxies API calls to `http://localhost:8080` and expects the WebSocket endpoint at `ws://localhost:8080/ws-chat`.

## Database Schema

| Table | Columns |
| ----- | ------- |
| `users` | `id` (PK), `username` (unique), `display_name` |
| `conversations` | `id` (PK), `title`, `created_at` |
| `conversation_participants` | `conversation_id` (FK), `user_id` (FK) |
| `messages` | `id` (PK), `conversation_id` (FK), `sender_id` (FK), `content`, `sent_at` |

The schema ensures third normal form by separating user identities, conversation metadata, and messages, while using a junction table for participants.

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

## Scaling Considerations

* Enable sticky sessions in the load balancer if you scale the Spring Boot nodes horizontally, or externalize the STOMP broker (e.g., RabbitMQ) for full statelessness.
* Tune `spring.datasource.hikari.maximum-pool-size` to accommodate database load for 1,000 users.
* Use `management/health` for load balancer health checks.

## License

MIT
