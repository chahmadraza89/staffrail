import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/shared/app_image.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class SignUpWeb extends ConsumerStatefulWidget {
  const SignUpWeb({super.key});

  @override
  ConsumerState<SignUpWeb> createState() => _SignUpWebState();
}

class _SignUpWebState extends ConsumerState<SignUpWeb>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _employeeIdController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Animation Variables
  late AnimationController _animationController;
  late Animation<double> _leftPanelFade;
  late Animation<Offset> _leftPanelSlide;
  late Animation<double> _titleFade;
  late Animation<Offset> _titleSlide;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;
  late Animation<double> _footerFade;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _leftPanelFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
      ),
    );
    _leftPanelSlide =
        Tween<Offset>(begin: const Offset(-0.05, 0), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
          ),
        );

    _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
      ),
    );
    _titleSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
          ),
        );

    _formFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.4, 0.8, curve: Curves.easeOutSine),
      ),
    );
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.4, 0.8, curve: Curves.easeOutSine),
          ),
        );

    _footerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.6, 1.0, curve: Curves.easeInSine),
      ),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _nameController.dispose();
    _employeeIdController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _signUp() {
    if (!_formKey.currentState!.validate()) return;
    if (!ref.read(termsAcceptedWebProvider)) {
      ToastService.showWarning(
        context,
        'Please accept the Terms of Service to continue.',
      );
      return;
    }
    ref
        .read(authViewModelProvider.notifier)
        .signUp(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
          name: _nameController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authViewModelProvider);
    final termsAccepted = ref.watch(termsAcceptedWebProvider);
    final isSmallScreen = context.screenWidth < 900;

    ref.listen<AsyncValue>(authViewModelProvider, (_, state) {
      if (!state.isLoading && state.hasError) {
        ToastService.showError(
          context,
          AppErrorMapper.getUserFriendlyMessage(state.error),
        );
      }
    });

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Row(
        children: [
          // ==========================================
          // LEFT SIDE: BRANDING PANEL (Animated & Responsive)
          // ==========================================
          if (!isSmallScreen)
            Expanded(
              flex: 1,
              child: FadeTransition(
                opacity: _leftPanelFade,
                child: SlideTransition(
                  position: _leftPanelSlide,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          theme.colorScheme.primary.withValues(alpha: 0.05),
                          theme.colorScheme.primary.withValues(alpha: 0.15),
                        ],
                      ),
                    ),
                    child: Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(48.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              inAppLogo,
                              height: 280,
                              fit: BoxFit.contain,
                            ),
                            const SizedBox(height: 40),
                            Text(
                              'Join StaffRail',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.displaySmall?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.bold,
                                height: 1.2,
                                letterSpacing: -1.0,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 32.0,
                              ),
                              child: Text(
                                'Become part of our dedicated team of professionals focused on empowering mental healthcare.',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: theme.colorScheme.onSurface
                                      .withValues(alpha: 0.7),
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // ==========================================
          // RIGHT SIDE: THE FORM (Expanded Width)
          // ==========================================
          Expanded(
            flex: 1, // Full width on small screens, half on large
            child: Center(
              child: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: isSmallScreen ? 24.0 : 48.0,
                    vertical: 24.0,
                  ),
                  child: ConstrainedBox(
                    // INCREASED WIDTH to 540 to stretch out the fields
                    constraints: const BoxConstraints(maxWidth: 540),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Optional Back Button
                          if (context.canPop()) ...[
                            FadeTransition(
                              opacity: _titleFade, // Fixed animation targeting
                              child: Container(
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.surface,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.04),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: IconButton(
                                  icon: const Icon(
                                    Icons.arrow_back_ios_new_rounded,
                                    size: 20,
                                  ),
                                  color: theme.colorScheme.onSurface,
                                  onPressed: () => context.pop(),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Title Section
                          FadeTransition(
                            opacity: _titleFade,
                            child: SlideTransition(
                              position: _titleSlide,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Create an Account',
                                    style: theme.textTheme.headlineMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w800,
                                          color: theme.colorScheme.onSurface,
                                          letterSpacing: -0.5,
                                        ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Fill out the details below to complete your registration.',
                                    style: theme.textTheme.titleMedium
                                        ?.copyWith(
                                          color: theme.colorScheme.onSurface
                                              .withValues(alpha: 0.6),
                                          fontSize: 15,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 48),

                          // Form Fields Section
                          FadeTransition(
                            opacity: _formFade,
                            child: SlideTransition(
                              position: _formSlide,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Name
                                  const _FieldLabel(text: 'Full Name'),
                                  CustomTextField(
                                    controller: _nameController,
                                    hintText: 'John Doe',
                                    validator: ValidateFields.validateName,
                                  ),
                                  const SizedBox(height: 20),

                                  // Emp ID
                                  const _FieldLabel(
                                    text: 'Employee ID (Optional)',
                                  ),
                                  CustomTextField(
                                    controller: _employeeIdController,
                                    hintText: 'e.g. EMP-123',
                                  ),
                                  const SizedBox(height: 20),

                                  // Email
                                  const _FieldLabel(text: 'Email Address'),
                                  CustomTextField(
                                    controller: _emailController,
                                    hintText: 'john@example.com',
                                    keyboardType: TextInputType.emailAddress,
                                    validator: ValidateFields.validateEmail,
                                  ),
                                  const SizedBox(height: 20),

                                  // Passwords Row on wide screens, Column on mobile
                                  if (!isSmallScreen) ...[
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const _FieldLabel(
                                                text: 'Password',
                                              ),
                                              CustomTextField(
                                                controller: _passwordController,
                                                obscureText: true,
                                                hintText: 'Password',
                                                validator: ValidateFields
                                                    .validatePassword,
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const _FieldLabel(
                                                text: 'Confirm Password',
                                              ),
                                              CustomTextField(
                                                controller:
                                                    _confirmPasswordController,
                                                obscureText: true,
                                                hintText: 'Confirm Password',
                                                validator: (value) =>
                                                    ValidateFields.validateConfirmPassword(
                                                      value,
                                                      _passwordController.text,
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ] else ...[
                                    const _FieldLabel(text: 'Password'),
                                    CustomTextField(
                                      controller: _passwordController,
                                      obscureText: true,
                                      hintText: 'Password',
                                      validator:
                                          ValidateFields.validatePassword,
                                    ),
                                    const SizedBox(height: 20),
                                    const _FieldLabel(text: 'Confirm Password'),
                                    CustomTextField(
                                      controller: _confirmPasswordController,
                                      obscureText: true,
                                      hintText: 'Confirm Password',
                                      validator: (value) =>
                                          ValidateFields.validateConfirmPassword(
                                            value,
                                            _passwordController.text,
                                          ),
                                    ),
                                  ],
                                  const SizedBox(height: 24),

                                  // Terms
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: Checkbox(
                                          value: termsAccepted,
                                          activeColor:
                                              theme.colorScheme.primary,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          onChanged: (v) =>
                                              ref
                                                      .read(
                                                        termsAcceptedWebProvider
                                                            .notifier,
                                                      )
                                                      .updateState =
                                                  v ?? false,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          'I agree to the Terms of Service & Privacy Policy',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                            color: theme.colorScheme.onSurface
                                                .withValues(alpha: 0.8),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 32),

                                  // Sign Up Button
                                  Center(
                                    child: SizedBox(
                                      width: isSmallScreen
                                          ? double.infinity
                                          : 340,
                                      height: 50,
                                      child: CustomButton(
                                        text: 'Register',
                                        isLoading: authState.isLoading,
                                        onPressed: _signUp,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Footer Section
                          FadeTransition(
                            opacity: _footerFade,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Already have an account? ",
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: theme.colorScheme.onSurface
                                        .withValues(alpha: 0.7),
                                  ),
                                ),
                                TextButton(
                                  onPressed: () => context.go(AuthRoutes.login),
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                    foregroundColor: theme.colorScheme.primary,
                                  ),
                                  child: const Text(
                                    'Sign In',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;

  const _FieldLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        text,
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 14,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.9),
        ),
      ),
    );
  }
}
