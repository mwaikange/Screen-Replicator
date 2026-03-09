import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../lib/theme';
import { groupsApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Group, GroupMessage, GroupMember, GroupJoinRequest } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');

function formatTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function GroupChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await groupsApi.getMessages(groupId);
      setMessages(res.data);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  }, [groupId]);

  const loadData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '';
    setCurrentUserId(userId);

    const [groupRes, membersRes, pendingRes] = await Promise.all([
      groupsApi.getById(groupId),
      groupsApi.getMembers(groupId),
      userId ? supabase.from('group_requests').select('id').eq('group_id', groupId).eq('user_id', userId).eq('status', 'pending').maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setGroup(groupRes.data);
    setMembers(membersRes.data);

    const memberEntry = membersRes.data.find((m: GroupMember) => m.userId === userId);
    setIsMember(!!memberEntry);
    setUserRole(memberEntry?.role || null);
    setRequestPending(!!pendingRes.data);

    if (memberEntry?.role === 'creator') {
      const reqRes = await groupsApi.getJoinRequests(groupId);
      setJoinRequests(reqRes.data);
    }

    if (groupRes.data) {
      setEditName(groupRes.data.name);
      setEditArea(groupRes.data.area);
      setEditIsPublic(groupRes.data.isPublic);
    }

    await loadMessages();
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  useEffect(() => {
    const channel = supabase
      .channel(`group_messages_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    const poll = setInterval(loadMessages, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [groupId, loadMessages]);

  const handleSend = async () => {
    if (!messageText.trim() && !imagePreview) return;
    await groupsApi.sendMessage(groupId, messageText.trim() || (imagePreview ? '📷 Photo' : ''), imagePreview);
    setMessageText('');
    setImagePreview(null);
    await loadMessages();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDeleteMessage = (item: GroupMessage) => {
    if (item.userId !== currentUserId) return;
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('group_messages')
                .delete()
                .eq('id', item.id)
                .eq('user_id', currentUserId);
              await loadMessages();
            } catch (e) {
              console.error('Failed to delete message:', e);
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant access to your photo library to share images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImagePreview(result.assets[0].uri);
    }
  };

  const handleJoin = async () => {
    const res = await groupsApi.join(groupId);
    if (res.data.status === 'joined') {
      Alert.alert('Joined', 'You have joined the group!');
      loadData();
    } else if (res.data.status === 'requested') {
      setRequestPending(true);
      Alert.alert('Requested', 'Your join request has been sent. The group creator will review it.');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    await groupsApi.approveRequest(groupId, requestId);
    const reqRes = await groupsApi.getJoinRequests(groupId);
    setJoinRequests(reqRes.data);
    const membersRes = await groupsApi.getMembers(groupId);
    setMembers(membersRes.data);
    const groupRes = await groupsApi.getById(groupId);
    setGroup(groupRes.data);
  };

  const handleDenyRequest = async (requestId: string) => {
    await groupsApi.denyRequest(groupId, requestId);
    const reqRes = await groupsApi.getJoinRequests(groupId);
    setJoinRequests(reqRes.data);
  };

  const handleLeave = async () => {
    await groupsApi.leave(groupId);
    setShowMembers(false);
    loadData();
  };

  const handleRemoveMember = async (userId: string) => {
    await groupsApi.removeMember(groupId, userId);
    const res = await groupsApi.getMembers(groupId);
    setMembers(res.data);
    const groupRes = await groupsApi.getById(groupId);
    setGroup(groupRes.data);
  };

  const handleSaveSettings = async () => {
    await groupsApi.update(groupId, {
      name: editName,
      area: editArea,
      isPublic: editIsPublic,
    });
    setShowSettings(false);
    loadData();
  };

  const handleDeleteGroup = async () => {
    await groupsApi.deleteGroup(groupId);
    navigation.goBack();
  };

  const renderMessage = ({ item }: { item: GroupMessage }) => {
    const isOwn = currentUserId && item.userId === currentUserId;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => isOwn && handleDeleteMessage(item)}
        delayLongPress={500}
      >
        <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
          {!isOwn && (
            <View style={styles.messageAvatar}>
              <Text style={styles.messageAvatarText}>{item.userName.charAt(0)}</Text>
            </View>
          )}
          <View style={[styles.messageBubbleContainer, isOwn ? styles.messageBubbleContainerOwn : styles.messageBubbleContainerOther]}>
            <View style={[styles.messageHeaderRow, isOwn ? styles.messageHeaderOwn : null]}>
              <Text style={[styles.messageName, isOwn ? styles.messageNameOwn : null]}>{item.userName}</Text>
              <Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : null]}>{formatTime(item.createdAt)}</Text>
            </View>
            <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} resizeMode="cover" />
              )}
              {item.text && item.text !== '📷 Photo' && (
                <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : null]}>{item.text}</Text>
              )}
            </View>
          </View>
          {isOwn && (
            <View style={styles.messageAvatar}>
              <Text style={styles.messageAvatarText}>{item.userName.charAt(0)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.cardForeground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
          <View style={styles.headerMeta}>
            <Ionicons
              name={group.isPublic ? 'globe-outline' : 'lock-closed-outline'}
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={styles.headerMetaText}>{group.memberCount} members</Text>
            <Text style={styles.headerMetaText}>-</Text>
            <Text style={styles.headerMetaText}>Area: {group.area}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.headerButton}>
          <Ionicons name="people-outline" size={22} color={colors.cardForeground} />
        </TouchableOpacity>
        {userRole === 'creator' && (
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={22} color={colors.cardForeground} />
          </TouchableOpacity>
        )}
      </View>

      {!isMember ? (
        <View style={styles.joinContainer}>
          <View style={styles.joinCard}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.joinTitle}>{group.name}</Text>
            <Text style={styles.joinSubtitle}>
              {group.isPublic ? 'Public' : 'Private'} group - {group.memberCount} members
            </Text>
            <Text style={styles.joinSubtitle}>Area: {group.area}</Text>
            <TouchableOpacity
              style={[styles.joinButton, !group.isPublic && styles.joinButtonOutline, requestPending && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={requestPending}
            >
              <Text style={[styles.joinButtonText, !group.isPublic && styles.joinButtonTextOutline]}>
                {requestPending ? 'Request Pending' : group.isPublic ? 'Join Group' : 'Request to Join'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesText}>No messages yet. Start the conversation!</Text>
              </View>
            }
          />
          <View style={styles.inputBar}>
            {imagePreview && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imagePreview }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImagePreview(null)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TouchableOpacity onPress={handlePickImage} style={styles.attachButton}>
                <Ionicons name="image-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.mutedForeground}
                value={messageText}
                onChangeText={setMessageText}
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!messageText.trim() && !imagePreview) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!messageText.trim() && !imagePreview}
              >
                <Ionicons name="send" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={showMembers} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Members ({members.length})</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{member.userName.charAt(0)}</Text>
                  </View>
                  <View style={styles.memberInfoCol}>
                    <Text style={styles.memberName}>{member.userName}</Text>
                    <Text style={styles.memberRole}>{member.role}</Text>
                  </View>
                  {userRole === 'creator' && member.role !== 'creator' && (
                    <TouchableOpacity onPress={() => handleRemoveMember(member.userId)} style={styles.removeButton}>
                      <Ionicons name="person-remove-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
            {isMember && userRole !== 'creator' && (
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                <Ionicons name="log-out-outline" size={18} color={colors.cardForeground} />
                <Text style={styles.leaveButtonText}>Leave Group</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Settings</Text>
              <TouchableOpacity onPress={() => { setShowSettings(false); setConfirmDelete(false); }}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingsField}>
                <Text style={styles.settingsLabel}>Group Name</Text>
                <TextInput
                  style={styles.settingsInput}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>
              <View style={styles.settingsField}>
                <Text style={styles.settingsLabel}>Area</Text>
                <TextInput
                  style={styles.settingsInput}
                  value={editArea}
                  onChangeText={setEditArea}
                />
              </View>
              <View style={styles.settingsToggleRow}>
                <Text style={styles.settingsLabel}>Public Group</Text>
                <TouchableOpacity
                  style={[styles.toggle, editIsPublic && styles.toggleActive]}
                  onPress={() => setEditIsPublic(!editIsPublic)}
                >
                  <View style={[styles.toggleThumb, editIsPublic && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>

              {!group.isPublic && (
                <TouchableOpacity
                  style={styles.requestsButton}
                  onPress={() => {
                    setShowSettings(false);
                    setShowRequests(true);
                  }}
                >
                  <Ionicons name="person-add-outline" size={16} color={colors.cardForeground} />
                  <Text style={styles.requestsButtonText}>View Join Requests ({joinRequests.length})</Text>
                </TouchableOpacity>
              )}

              <View style={styles.deleteSection}>
                {confirmDelete ? (
                  <View>
                    <Text style={styles.deleteWarning}>Are you sure? This action cannot be undone.</Text>
                    <View style={styles.deleteActions}>
                      <TouchableOpacity
                        style={styles.cancelDeleteButton}
                        onPress={() => setConfirmDelete(false)}
                      >
                        <Text style={styles.cancelDeleteText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmDeleteButton}
                        onPress={handleDeleteGroup}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.destructiveForeground} />
                        <Text style={styles.confirmDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setConfirmDelete(true)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    <Text style={styles.deleteButtonText}>Delete Group</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showRequests} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Requests ({joinRequests.length})</Text>
              <TouchableOpacity onPress={() => setShowRequests(false)}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {joinRequests.length === 0 ? (
                <Text style={styles.emptyRequestsText}>No pending requests</Text>
              ) : (
                joinRequests.map((request) => (
                  <View key={request.id} style={styles.requestRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{request.userName.charAt(0)}</Text>
                    </View>
                    <View style={styles.memberInfoCol}>
                      <Text style={styles.memberName}>{request.userName}</Text>
                      <Text style={styles.memberRole}>{formatTime(request.createdAt)}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApproveRequest(request.id)}
                      >
                        <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.denyButton}
                        onPress={() => handleDenyRequest(request.id)}
                      >
                        <Ionicons name="close" size={18} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerMetaText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  headerButton: {
    padding: 6,
  },
  joinContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  joinCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 340,
  },
  joinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  joinSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  joinButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  joinButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  joinButtonTextOutline: {
    color: colors.cardForeground,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: 8,
  },
  emptyMessages: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  messageBubbleContainer: {
    maxWidth: '75%',
  },
  messageBubbleContainerOwn: {
    alignItems: 'flex-end',
  },
  messageBubbleContainerOther: {
    alignItems: 'flex-start',
  },
  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  messageHeaderOwn: {
    flexDirection: 'row-reverse',
  },
  messageName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  messageNameOwn: {
    color: colors.cardForeground,
  },
  messageTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  messageTimeOwn: {
    color: colors.mutedForeground,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.muted,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: colors.cardForeground,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: colors.primaryForeground,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 4,
  },
  inputBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachButton: {
    padding: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.cardForeground,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  modalBody: {
    padding: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  memberInfoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  memberRole: {
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 6,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  settingsField: {
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 6,
  },
  settingsInput: {
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.cardForeground,
  },
  settingsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  requestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 12,
    marginBottom: 16,
  },
  requestsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  deleteSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.destructive,
  },
  deleteWarning: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.destructive,
    marginBottom: 12,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelDeleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.destructive,
    borderRadius: 6,
    paddingVertical: 10,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.destructiveForeground,
  },
  emptyRequestsText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 16,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
