import 'package:bhmh/core/data/local_data_store.dart';
import 'package:equatable/equatable.dart';

class NotificationEntity extends Equatable {
  final String id;
  final String title;
  final String body;
  final String type;
  final Map<String, dynamic> data;
  final bool isRead;
  final DateTime createdAt;

  const NotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.data,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationEntity.fromFirestore(Map<String, dynamic> json, String id) {
    final rawCreated = json['createdAt'];
    DateTime parsedTime = DateTime.now();
    if (rawCreated is LocalTimestamp) {
      parsedTime = rawCreated.toDate();
    } else if (rawCreated is DateTime) {
      parsedTime = rawCreated;
    }
    return NotificationEntity(
      id: id,
      title: json['title'] as String? ?? 'Notification',
      body: json['body'] as String? ?? '',
      type: json['type'] as String? ?? 'system',
      data: json['data'] as Map<String, dynamic>? ?? {},
      isRead: json['isRead'] as bool? ?? false,
      createdAt: parsedTime,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'body': body,
      'type': type,
      'data': data,
      'isRead': isRead,
      'createdAt': LocalTimestamp.fromDate(createdAt),
    };
  }

  NotificationEntity copyWith({
    String? id,
    String? title,
    String? body,
    String? type,
    Map<String, dynamic>? data,
    bool? isRead,
    DateTime? createdAt,
  }) {
    return NotificationEntity(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      data: data ?? this.data,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [id, title, body, type, data, isRead, createdAt];
}
