import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';

class MessageEntity extends Equatable {
  final String id;
  final String title;
  final String content;
  final String authorId;
  final String authorName; // NEW
  final String? recipientId;
  final DateTime timestamp;
  final bool isPushEnabled;

  const MessageEntity({
    required this.id,
    required this.title,
    required this.content,
    required this.authorId,
    required this.authorName, // NEW
    this.recipientId,
    required this.timestamp,
    required this.isPushEnabled,
  });

  factory MessageEntity.fromFirestore(Map<String, dynamic> json, String id) {
    return MessageEntity(
      id: id,
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      authorId: json['authorId'] as String? ?? '',
      authorName: json['authorName'] as String? ?? 'Admin', // Default to Admin
      recipientId: json['recipientId'] as String?,
      timestamp: (json['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isPushEnabled: json['isPushEnabled'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'content': content,
      'authorId': authorId,
      'authorName': authorName, // NEW
      'recipientId': recipientId ?? 'broadcast',
      'timestamp': Timestamp.fromDate(timestamp),
      'isPushEnabled': isPushEnabled,
    };
  }

  MessageEntity copyWith({
    String? id,
    String? title,
    String? content,
    String? authorId,
    String? authorName,
    String? recipientId,
    DateTime? timestamp,
    bool? isPushEnabled,
  }) {
    return MessageEntity(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      recipientId: recipientId ?? this.recipientId,
      timestamp: timestamp ?? this.timestamp,
      isPushEnabled: isPushEnabled ?? this.isPushEnabled,
    );
  }

  @override
  List<Object?> get props => [id, title, content, authorId, authorName, recipientId, timestamp, isPushEnabled];
}
