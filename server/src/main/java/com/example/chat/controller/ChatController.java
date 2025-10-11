package com.example.chat.controller;

import com.example.chat.dto.MessageView;
import com.example.chat.model.Message;
import com.example.chat.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<MessageView>> getMessages(@PathVariable Long conversationId) {
        List<Message> messages = chatService.getConversationMessages(conversationId);
        List<MessageView> views = messages.stream()
                .map(message -> new MessageView(
                        message.getId(),
                        conversationId,
                        message.getSender().getId(),
                        message.getSender().getDisplayName(),
                        message.getContent(),
                        message.getSentAt()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(views);
    }
}
