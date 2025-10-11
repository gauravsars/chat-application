package com.example.chat.controller;

import com.example.chat.dto.ChatMessagePayload;
import com.example.chat.dto.MessageView;
import com.example.chat.model.ChatUser;
import com.example.chat.service.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
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
    public void sendMessage(@Payload ChatMessagePayload payload) {
        if (payload.getSenderId() == null || payload.getRecipientId() == null) {
            log.warn("Rejecting message without sender ({}) or recipient ({})", payload.getSenderId(), payload.getRecipientId());
            return;
        }

        ChatUser sender;
        ChatUser recipient;
        try {
            sender = chatService.requireUser(payload.getSenderId());
            recipient = chatService.requireUser(payload.getRecipientId());
        } catch (IllegalArgumentException ex) {
            log.warn("Rejecting message for unknown user: {}", ex.getMessage());
            return;
        }

        long expectedConversationId = chatService.directConversationId(sender.getId(), recipient.getId());
        Long requestedConversationId = payload.getConversationId();
        long conversationId = requestedConversationId != null && requestedConversationId == expectedConversationId
                ? requestedConversationId
                : expectedConversationId;

        if (requestedConversationId != null && requestedConversationId != expectedConversationId) {
            log.warn("Overriding conversation id {} with expected id {} for users {} and {}", requestedConversationId, expectedConversationId, sender.getId(), recipient.getId());
        }

        MessageView view = chatService.persistDirectMessage(conversationId, sender, recipient, payload.getContent());
        log.debug("Broadcasting message {} between users {} and {}", view.getId(), sender.getId(), recipient.getId());
        messagingTemplate.convertAndSend("/topic/conversations/" + view.getConversationId(), view);
    }
}
