// DATA LAYER: DTO (Data Transfer Object)
// =============================================================================

import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class UserDTO {
  // --- DESERIALIZATION (Firestore to Domain) ---
  static UserEntity fromFirestore(DocumentSnapshot doc) {
    final map = doc.data() as Map<String, dynamic>?;

    if (map == null) {
      throw Exception('Document data was null for User ID: ${doc.id}');
    }

    // FAIL FAST: Throw an exception if critical data is missing or corrupted
    if (map['createdAt'] == null || map['lastLogin'] == null) {
      throw const FormatException(
        'Critical timestamp data missing from database.',
      );
    }

    // ✅ FIX: Enhanced parsing to handle Strings (useful for JSON imports/migrations)
    DateTime parseDate(dynamic dateVal) {
      if (dateVal is Timestamp) return dateVal.toDate();
      if (dateVal is int) return DateTime.fromMillisecondsSinceEpoch(dateVal);
      if (dateVal is String) return DateTime.parse(dateVal);
      throw FormatException('Invalid date format in database: $dateVal');
    }

    // ✅ FIX: Strict type casting for enum parsing
    // ignore: unused_local_variable
    final String? roleStr = map['role'] as String?;

    return UserEntity(
      uid: doc.id, // Prefer pulling the ID directly from the document
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

  // --- SERIALIZATION (Domain to Firestore) ---
  static Map<String, dynamic> toFirestore(UserEntity user) {
    return {
      'email': user.email,
      'name': user.name,
      'photoUrl': user.photoUrl,
      'bio': user.bio,
      // Use client time for createdAt ONLY if you aren't using FieldValue.serverTimestamp() in the repo
      'createdAt': Timestamp.fromDate(user.createdAt),
      'lastLogin': Timestamp.fromDate(user.lastLogin),
      'role': user.role.name,
      'adminId': user.adminId,
      'isActive': user.isActive,
      'fcmToken': user.fcmToken,
      'notificationPreferences': user.notificationPreferences,
      'department': user.department,
    };
  }

  // Use this specifically for updates to ensure the server dictates the time
  // preventing timezone collisions among multiple users
  static Map<String, dynamic> updateLastLoginToFirestore() {
    return {'lastLogin': FieldValue.serverTimestamp()};
  }
}
