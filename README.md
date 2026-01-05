# Chat Application

Solution Provided For Below Business/User Requirement :

Login To Chat System

1. Open the React app (e.g. npm run dev → http://localhost:3000).
   
<img width="398" height="245" alt="image" src="https://github.com/user-attachments/assets/9dce07fd-88f7-4f65-8237-34315b8cb2e3" />


Registration For New User

<img width="397" height="278" alt="image" src="https://github.com/user-attachments/assets/2f89c4cf-2adb-40cc-8f97-86e75aa6589f" />


2. After authentication, enter the user ID you want to chat with in the Chat partner ID field. Previous history of chat is fetched Till last one month.

3. Both user browsers, fetch the existing chat history if both have logged in and connected to the web socket server.
   
userID : 3

<img width="416" height="463" alt="image" src="https://github.com/user-attachments/assets/de922f1f-0266-4eca-9373-9c58881a99d7" />

userID : 4

<img width="295" height="347" alt="image" src="https://github.com/user-attachments/assets/818d4713-33ba-495a-a386-17be009c9c24" />




## Architecture Overview

For 1000 to 10000 users with 10k-20k messages per day single web socket server is more then sufficient which is the scope of this chat application. 


Tech - Stack
```

* **Backend:** Spring Boot 3, Spring Security
* **Frontend:** React 18 with Vite.
* **Database:** PostgreSQL
* **WebSocket:** A single STOMP endpoint (`/ws-chat`) handles all socket connections;

## Backend (Spring Boot)

* Entities for users, conversations, and messages with normalized relationships.
* REST endpoint to fetch conversation history (`/api/conversations/{id}/messages`).
* Authentication endpoints for registering (`POST /api/auth/register`) and logging in (`POST /api/auth/login`) users with numeric IDs and passwords.
* WebSocket controller that persists incoming messages, ensures both participants already exist, and broadcasts them to subscribers via `/topic/conversations/{id}`.
```

### Database Configure PostgreSQL

1. **Create database & user** – connect with `psql` (or any SQL client) and create a dedicated database and login role:

   ```sql
   CREATE DATABASE chatapp;
   CREATE USER chatapp WITH PASSWORD 'secret';
   GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatapp;

## Database Schema

| Table | Columns |
| ----- | ------- |
| `users` | `id` (PK), `username` (unique), `display_name`, `password_hash` |
| `conversations` | `id` (PK), `title`, `created_at` |
| `conversation_participants` | `conversation_id` (FK), `user_id` (FK) |
| `messages` | `id` (PK), `conversation_id` (FK), `sender_id` (FK), `content`, `sent_at` |


## Scaling Considerations

For 1000 to 10000 users with 10k-20k messages per day single web socket server is more then sufficient which is the scope of this chat application. 
For Upto 10K users (assuming sending 50k messages per day) , single web socket node server will be sufficient handle this much amount of load.

Also Database Postgreql Would be sufficient to store these many messages. However if app is serving 10k messages per day then after some days say 1 month , we can transfer the data into historical_messages 
table. 
When traffic goes large , say 50k messages are exchanged per day. Then we can consider adding load-balancer and should consider multi node web socket server.

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



* Introduce Load Balancer and configure it with the multi nodes of websocket server.
* Tune `spring.datasource.hikari.maximum-pool-size` to accommodate database load for 1,0000+ chat application users.
*Indexing on messages table for fast retrival of messages based on userIDs interacting.


