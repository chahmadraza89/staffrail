import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/admin/admin_profile/models/admin_profile_models.dart';
import 'package:bhmh/features/admin/admin_profile/widgets/change_password_tile.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ChangePasswordView extends ConsumerStatefulWidget {
  final PasswordRequirements requirements;
  final String? fallbackRoute;

  const ChangePasswordView({
    super.key,
    required this.requirements,
    this.fallbackRoute,
  });

  @override
  ConsumerState<ChangePasswordView> createState() => _ChangePasswordViewState();
}

class _ChangePasswordViewState extends ConsumerState<ChangePasswordView> {
  // Controllers
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Visibility Toggles
  bool _obscureOld = true;
  bool _obscureNew = false;
  bool _obscureConfirm = true;

  // Form State
  final _formKey = GlobalKey<FormState>();
  Map<String, bool> _rules = {};
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize rules based on requirements
    _rules = ValidateFields.getPasswordRules(
      '',
      minLength: widget.requirements.minLength,
    );

    // Real-time listener for the checklist
    _newPasswordController.addListener(() {
      setState(() {
        _rules = ValidateFields.getPasswordRules(
          _newPasswordController.text,
          minLength: widget.requirements.minLength,
        );
      });
    });

    // Listeners to refresh UI for checkmarks
    _oldPasswordController.addListener(() => setState(() {}));
    _confirmPasswordController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool get _isNewPasswordValid => !_rules.containsValue(false);

  Future<void> _handleUpdatePassword() async {
    // 1. Trigger Form Validation
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // 2. Execute Update
    setState(() => _isLoading = true);

    final success = await ref
        .read(authViewModelProvider.notifier)
        .changePassword(
          currentPassword: _oldPasswordController.text.trim(),
          newPassword: _newPasswordController.text.trim(),
        );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password updated successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(widget.fallbackRoute ?? AdminRoutes.profile);
      }
    } else {
      final error = ref.read(authViewModelProvider).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error?.toString() ?? 'Failed to update password. Please try again.',
          ),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(isMobile ? 24 : 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Change Password',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 32),

            // --- OLD PASSWORD ---
            AnimatedPasswordField(
              controller: _oldPasswordController,
              label: 'Old Password',
              hint: 'Enter your old password',
              obscureText: _obscureOld,
              onToggleVisibility: () =>
                  setState(() => _obscureOld = !_obscureOld),
              validator: ValidateFields.validateLoginPassword,
              isValid: _oldPasswordController.text.isNotEmpty,
              showSuccessCheck: true,
              enabled: !_isLoading,
            ),

            const SizedBox(height: 32),

            // --- NEW PASSWORD ---
            AnimatedPasswordField(
              controller: _newPasswordController,
              label: 'New Password',
              hint: 'Create a strong password',
              obscureText: _obscureNew,
              onToggleVisibility: () =>
                  setState(() => _obscureNew = !_obscureNew),
              validator: (v) => ValidateFields.validatePassword(
                v,
                minLength: widget.requirements.minLength,
              ),
              enabled: !_isLoading,
            ),

            // Validation Checklist
            AnimatedSize(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              alignment: Alignment.topCenter,
              child:
                  (_newPasswordController.text.isNotEmpty &&
                      !_isNewPasswordValid)
                  ? Padding(
                      padding: const EdgeInsets.only(top: 12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Please add all necessary characters to create safe password.',
                            style: TextStyle(
                              color: Color(0xFFEF4444),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ValidationRule(
                            label:
                                'Minimum characters ${widget.requirements.minLength}',
                            isValid: _rules['minLength'] ?? false,
                            isErrorState:
                                !(_rules['minLength'] ?? false) &&
                                _newPasswordController.text.isNotEmpty,
                          ),
                          if (widget.requirements.requireUppercase)
                            ValidationRule(
                              label: 'One uppercase character',
                              isValid: _rules['uppercase'] ?? false,
                              isErrorState:
                                  !(_rules['uppercase'] ?? false) &&
                                  _newPasswordController.text.isNotEmpty,
                            ),
                          if (widget.requirements.requireLowercase)
                            ValidationRule(
                              label: 'One lowercase character',
                              isValid: _rules['lowercase'] ?? false,
                              isErrorState:
                                  !(_rules['lowercase'] ?? false) &&
                                  _newPasswordController.text.isNotEmpty,
                            ),
                          if (widget.requirements.requireSpecialChar)
                            ValidationRule(
                              label: 'One special character',
                              isValid: _rules['special'] ?? false,
                              isErrorState:
                                  !(_rules['special'] ?? false) &&
                                  _newPasswordController.text.isNotEmpty,
                            ),
                          if (widget.requirements.requireNumber)
                            ValidationRule(
                              label: 'One number',
                              isValid: _rules['number'] ?? false,
                              isErrorState:
                                  !(_rules['number'] ?? false) &&
                                  _newPasswordController.text.isNotEmpty,
                            ),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
            ),

            const SizedBox(height: 32),

            // --- CONFIRM PASSWORD ---
            AnimatedPasswordField(
              controller: _confirmPasswordController,
              label: 'Confirm New Password',
              hint: 'Enter your Confirm New Password',
              obscureText: _obscureConfirm,
              onToggleVisibility: () =>
                  setState(() => _obscureConfirm = !_obscureConfirm),
              validator: (v) => ValidateFields.validateConfirmPassword(
                v,
                _newPasswordController.text,
              ),
              enabled: !_isLoading,
            ),

            const SizedBox(height: 40),

            // --- SUBMIT BUTTON ---
            AnimatedSaveButton(
              isLoading: _isLoading,
              onPressed: _handleUpdatePassword,
            ),
          ],
        ),
      ),
    );
  }
}
