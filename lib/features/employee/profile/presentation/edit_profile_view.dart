import 'dart:typed_data';
import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/edit_profile_widget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';

class UserProfile {
  final String name;
  final String email;
  final String? avatarUrl;

  const UserProfile({required this.name, required this.email, this.avatarUrl});
}

class EditProfileView extends ConsumerStatefulWidget {
  final UserProfile profile;

  const EditProfileView({super.key, required this.profile});

  @override
  ConsumerState<EditProfileView> createState() => _EditProfileViewState();
}

class _EditProfileViewState extends ConsumerState<EditProfileView> {
  late TextEditingController _nameController;
  Uint8List? _selectedImageBytes;
  String? _selectedImageName;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.profile.name);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final picker = ref.read(filePickerServiceProvider);
      final file = await picker.pickImage();

      if (file != null && file.bytes != null) {
        setState(() {
          _selectedImageBytes = file.bytes;
          _selectedImageName = file.name;
        });
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  void _editName() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Name'),
        content: TextField(
          controller: _nameController,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Enter your name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {});
              Navigator.pop(context);
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveProfile() async {
    final success = await ref
        .read(authViewModelProvider.notifier)
        .updateProfile(
          name: _nameController.text,
          photoBytes: _selectedImageBytes,
          photoName: _selectedImageName,
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully!')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;
    final authState = ref.watch(authViewModelProvider);
    final isLoading = authState.isLoading;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isMobile ? 16 : 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- HEADER: Avatar, Info & Close ---
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarWithEditBadge(
                name: _nameController.text,
                selectedImageBytes: _selectedImageBytes,
                photoUrl: widget.profile.avatarUrl,
                onEdit: _pickImage,
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _nameController.text.isEmpty
                            ? 'Your name'
                            : _nameController.text,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.profile.email,
                        style: const TextStyle(
                          fontSize: 15,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Divider(height: 1, color: Color(0xFFF1F5F9)),
          ),

          // --- EDITABLE FIELDS LIST ---
          EditableFieldRow(
            label: 'Name',
            value: _nameController.text.isEmpty
                ? 'your name'
                : _nameController.text,
            isPlaceholder: _nameController.text.isEmpty,
            onTap: _editName,
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),

          EditableFieldRow(
            label: 'Email account',
            value: widget.profile.email,
            onTap: () {}, // Email usually not editable for security
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          const SizedBox(height: 40),

          // --- SAVE BUTTON ---
          AnimatedSaveButton(isLoading: isLoading, onPressed: _saveProfile),
        ],
      ),
    );
  }
}
