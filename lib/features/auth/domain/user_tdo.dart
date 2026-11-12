import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';

class UserDTO {
  static UserEntity fromFirestore(LocalDocumentSnapshot doc) {
    final map = doc.data() as Map<String, dynamic>?;

    if (map == null) {
      throw Exception('Document data was null for User ID: ${doc.id}');
    }

    if (map['createdAt'] == null || map['lastLogin'] == null) {
      throw const FormatException(
        'Critical timestamp data missing from store.',
      );
    }

    DateTime parseDate(dynamic dateVal) {
      if (dateVal is LocalTimestamp) return dateVal.toDate();
      if (dateVal is DateTime) return dateVal;
      if (dateVal is int) return DateTime.fromMillisecondsSinceEpoch(dateVal);
      if (dateVal is String) return DateTime.parse(dateVal);
      throw FormatException('Invalid date format: $dateVal');
    }

    return UserEntity(
      uid: doc.id,
      email: map['email'] as String? ?? '',
      name: map['name'] as String? ?? '',
      photoUrl: map['photoUrl'] as String?,
      bio: map['bio'] as String?,
      createdAt: parseDate(map['createdAt']),
      lastLogin: parseDate(map['lastLogin']),
      role: UserRole.values.firstWhere(
        (e) => e.name.toLowerCase() == (map['role'] as String?)?.toLowerCase(),
        orElse: () => UserRole.employee,
      ),
      adminId: map['adminId'] as String?,
      isActive: map['isActive'] as bool? ?? true,
      fcmToken: map['fcmToken'] as String?,
      notificationPreferences: map['notificationPreferences'] as Map<String, dynamic>?,
      department: map['department'] as String?,
    );
  }

  static Map<String, dynamic> toFirestore(UserEntity user) {
    return {
      'email': user.email,
      'name': user.name,
      'photoUrl': user.photoUrl,
      'bio': user.bio,
      'createdAt': LocalTimestamp.fromDate(user.createdAt),
      'lastLogin': LocalTimestamp.fromDate(user.lastLogin),
      'role': user.role.name,
      'adminId': user.adminId,
      'isActive': user.isActive,
      'fcmToken': user.fcmToken,
      'notificationPreferences': user.notificationPreferences,
      'department': user.department,
    };
  }

  static Map<String, dynamic> updateLastLoginToFirestore() {
    return {'lastLogin': LocalFieldValue.serverTimestamp()};
  }
}
