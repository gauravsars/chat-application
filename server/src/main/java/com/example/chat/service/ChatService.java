package com.example.chat.service;

import com.example.chat.dto.MessageView;
import com.example.chat.model.ChatUser;
import com.example.chat.model.Conversation;
import com.example.chat.model.Message;
import com.example.chat.repository.ChatUserRepository;
import com.example.chat.repository.ConversationRepository;
import com.example.chat.repository.MessageRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ChatService {

    private final ChatUserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final PasswordEncoder passwordEncoder;

    public ChatService(ChatUserRepository userRepository,
                       ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<ChatUser> findUser(Long id) {
        return userRepository.findById(id);
    }

    public ChatUser requireUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User %d not found".formatted(id)));
    }

    @Transactional
    public ChatUser registerUser(Long id, String rawPassword, String displayName) {
        if (id == null || rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("User id and password are required");
        }
        if (userRepository.existsById(id)) {
            throw new IllegalArgumentException("User %d already exists".formatted(id));
        }

        ChatUser user = new ChatUser();
        user.setId(id);
        user.setUsername("user_" + id);
        user.setDisplayName(displayName != null && !displayName.isBlank() ? displayName : "User " + id);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return userRepository.save(user);
    }

    public ChatUser authenticate(Long id, String rawPassword) {
        if (id == null || rawPassword == null) {
            throw new IllegalArgumentException("User id and password are required");
        }
        ChatUser user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        return user;
    }

    public Optional<Conversation> findConversation(Long id) {
        return conversationRepository.findById(id);
    }

    public long directConversationId(long firstUserId, long secondUserId) {
        long min = Math.min(firstUserId, secondUserId);
        long max = Math.max(firstUserId, secondUserId);
        long sum = min + max;
        return ((sum) * (sum + 1)) / 2 + max;
    }

    @Transactional
    public MessageView persistDirectMessage(Long conversationId, ChatUser sender, ChatUser recipient, String content) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseGet(() -> createDirectConversation(conversationId, sender, recipient));

        if (!conversation.getParticipants().contains(sender)) {
            conversation.getParticipants().add(sender);
        }
        if (!conversation.getParticipants().contains(recipient)) {
            conversation.getParticipants().add(recipient);
        }

        Message message = new Message(conversation, sender, content);
        Message saved = messageRepository.save(message);
        return new MessageView(
                saved.getId(),
                conversation.getId(),
                sender.getId(),
                sender.getDisplayName(),
                saved.getContent(),
                saved.getSentAt()
        );
    }

    private Conversation createDirectConversation(Long conversationId, ChatUser sender, ChatUser recipient) {
        long first = Math.min(sender.getId(), recipient.getId());
        long second = Math.max(sender.getId(), recipient.getId());
        Conversation conversation = new Conversation("Direct chat " + first + "-" + second);
        conversation.setId(conversationId);
        conversation.getParticipants().add(sender);
        conversation.getParticipants().add(recipient);
        return conversationRepository.save(conversation);
    }

    public List<Message> getConversationMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }
}
