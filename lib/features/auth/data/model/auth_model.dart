import 'package:equatable/equatable.dart';

// =============================================================================
// DOMAIN LAYER: ENTITY & ENUMS
// =============================================================================

enum UserRole { admin, employee }

class UserEntity extends Equatable {
  final String uid;
  final String email;
  final String name;
  final String? photoUrl;
  final String? bio;
  final DateTime createdAt;
  final DateTime lastLogin;
  final UserRole role;
  final String? adminId;
  final bool isActive;
  final String? fcmToken;
  final Map<String, dynamic>? notificationPreferences;
  final String? department;

  const UserEntity({
    required this.uid,
    required this.email,
    required this.name,
    this.photoUrl,
    this.bio,
    required this.createdAt,
    required this.lastLogin,
    this.role = UserRole.employee,
    this.adminId,
    this.isActive = true,
    this.fcmToken,
    this.notificationPreferences,
    this.department,
  });

  @override
  List<Object?> get props => [
    uid,
    email,
    name,
    photoUrl,
    bio,
    createdAt,
    lastLogin,
    role,
    adminId,
    isActive,
    fcmToken,
    notificationPreferences,
    department,
  ];

  UserEntity copyWith({
    String? uid,
    String? email,
    String? name,
    String? photoUrl,
    String? bio,
    DateTime? createdAt,
    DateTime? lastLogin,
    UserRole? role,
    String? adminId,
    bool? isActive,
    String? fcmToken,
    Map<String, dynamic>? notificationPreferences,
    String? department,
  }) {
    return UserEntity(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      name: name ?? this.name,
      photoUrl: photoUrl ?? this.photoUrl,
      bio: bio ?? this.bio,
      createdAt: createdAt ?? this.createdAt,
      lastLogin: lastLogin ?? this.lastLogin,
      role: role ?? this.role,
      adminId: adminId ?? this.adminId,
      isActive: isActive ?? this.isActive,
      fcmToken: fcmToken ?? this.fcmToken,
      notificationPreferences:
          notificationPreferences ?? this.notificationPreferences,
      department: department ?? this.department,
    );
  }
}
