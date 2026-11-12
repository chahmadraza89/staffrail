import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AdminEmployeeForm extends ConsumerStatefulWidget {
  final UserEntity? employee; // If provided, we are editing
  final bool isMobile;

  const AdminEmployeeForm({super.key, this.employee, required this.isMobile});

  @override
  ConsumerState<AdminEmployeeForm> createState() => _AdminEmployeeFormState();
}

class _AdminEmployeeFormState extends ConsumerState<AdminEmployeeForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.employee?.name);
    _emailController = TextEditingController(text: widget.employee?.email);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final actions = ref.read(adminDirectoryActionsProvider.notifier);

      if (widget.employee != null) {
        // --- EDIT MODE ---
        await actions.updateEmployee(
          uid: widget.employee!.uid,
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
        );
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Employee updated successfully'),
              backgroundColor: Color(0xFF109B85),
            ),
          );
        }
      } else {
        // --- ADD MODE (With Account Creation & Reset Link) ---
        final resetLink = await actions.registerStaff(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
        );

        if (mounted) {
          Navigator.pop(context); // Close the form
          _showSuccessDialog(resetLink);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSuccessDialog(String? resetLink) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Color(0xFF109B85), size: 28),
            SizedBox(width: 12),
            Text('Staff Registered', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'The account has been created successfully. Send the following reset link to the staff member so they can set their password.',
              style: TextStyle(color: Color(0xFF475569), fontSize: 14),
            ),
            const SizedBox(height: 20),
            if (resetLink != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Text(
                  resetLink,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B)),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: resetLink));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Link copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('Copy Reset Link'),
                  style: TextButton.styleFrom(foregroundColor: const Color(0xFF109B85)),
                ),
              ),
            ] else
              const Text(
                'Note: Reset link could not be generated. Please ask them to use "Forgot Password" on the login screen.',
                style: TextStyle(color: Colors.orange, fontSize: 12),
              ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF109B85),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Done', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryTeal = Color(0xFF109B85);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        24,
        24,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.employee != null ? 'Edit Employee' : 'Add New Employee',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                IconButton(
                  onPressed: _isLoading ? null : () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 24),
            CustomTextField(
              controller: _nameController,
              enabled: !_isLoading,
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Name is required' : null,
              hintText: 'Full Name',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _emailController,
              enabled: !_isLoading,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                hintText: 'e.g. john@example.com',
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Email is required';
                if (!v.contains('@')) return 'Invalid email format';
                return null;
              },
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryTeal,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        widget.employee != null ? 'Update Profile' : 'Add Employee',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
