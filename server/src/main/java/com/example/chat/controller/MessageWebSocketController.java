package com.example.chat.controller;

import com.example.chat.dto.ChatMessagePayload;
import com.example.chat.dto.MessageView;
import com.example.chat.model.ChatUser;
import com.example.chat.service.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class MessageWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(MessageWebSocketController.class);

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageWebSocketController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.send")
    @SendTo("/topic/public")
    public MessageView sendMessage(@Payload ChatMessagePayload payload) {
        ChatUser sender = chatService.findUser(payload.getSenderId())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + payload.getSenderId()));
        MessageView view = chatService.persistMessage(payload.getConversationId(), sender, payload.getContent());
        log.debug("Broadcasting message {} from user {}", view.getId(), sender.getUsername());
        messagingTemplate.convertAndSend("/topic/conversations/" + view.getConversationId(), view);
        return view;
    }
}
