package com.example.chat.service;

import com.example.chat.dto.MessageView;
import com.example.chat.model.ChatUser;
import com.example.chat.model.Conversation;
import com.example.chat.model.Message;
import com.example.chat.repository.ChatUserRepository;
import com.example.chat.repository.ConversationRepository;
import com.example.chat.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ChatService {

    private final ChatUserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public ChatService(ChatUserRepository userRepository,
                       ConversationRepository conversationRepository,
                       MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    public Optional<ChatUser> findUser(Long id) {
        return userRepository.findById(id);
    }

    public Optional<Conversation> findConversation(Long id) {
        return conversationRepository.findById(id);
    }

    @Transactional
    public MessageView persistMessage(Long conversationId, ChatUser sender, String content) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        Message message = new Message(conversation, sender, content);
        Message saved = messageRepository.save(message);
        return new MessageView(
                saved.getId(),
                conversationId,
                sender.getId(),
                sender.getDisplayName(),
                saved.getContent(),
                saved.getSentAt()
        );
    }

    public List<Message> getConversationMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }
}
