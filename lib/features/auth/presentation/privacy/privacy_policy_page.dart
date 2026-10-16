import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class PrivacyPolicyPage extends StatefulWidget {
  const PrivacyPolicyPage({super.key});

  @override
  State<PrivacyPolicyPage> createState() => _PrivacyPolicyPageState();
}

class _PrivacyPolicyPageState extends State<PrivacyPolicyPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    // Create staggered animations for 7 elements (Header + 5 Sections + Footer)
    _fadeAnimations = List.generate(7, (index) {
      final start = 0.1 * index;
      final end = start + 0.3;
      return Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Interval(
            start.clamp(0.0, 1.0),
            end.clamp(0.0, 1.0),
            curve: Curves.easeOut,
          ),
        ),
      );
    });

    _slideAnimations = List.generate(7, (index) {
      final start = 0.1 * index;
      final end = start + 0.3;
      return Tween<Offset>(
        begin: const Offset(0, 0.1),
        end: Offset.zero,
      ).animate(
        CurvedAnimation(
          parent: _controller,
          curve: Interval(
            start.clamp(0.0, 1.0),
            end.clamp(0.0, 1.0),
            curve: Curves.easeOutCubic,
          ),
        ),
      );
    });

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isMobile = context.screenWidth < 600;

    return Scaffold(
      appBar: CustomBar(
        showBackButton: true,
        onLeadingTap: () => Navigator.pop(context),
        title: Text(
          'Privacy Policy',
          style: theme.textTheme.titleLarge?.copyWith(
            fontSize: isMobile ? 16 : 18,
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.onSurface,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.symmetric(
          horizontal: isMobile
              ? context.screenWidth * 0.04
              : context.screenWidth * 0.02,
          vertical: isMobile ? 24.0 : context.screenHeight * 0.02,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            FadeTransition(
              opacity: _fadeAnimations[0],
              child: SlideTransition(
                position: _slideAnimations[0],
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        theme.colorScheme.primary.withValues(alpha: 0.05),
                        theme.colorScheme.primary.withValues(alpha: 0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: theme.colorScheme.primary.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withValues(
                            alpha: 0.1,
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          LucideIcons.shieldCheck,
                          color: theme.colorScheme.primary,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Your Privacy Matters',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                            // const SizedBox(height: 4),
                            // Text(
                            //   'Last Updated: April 28, 2026',
                            //   style: theme.textTheme.bodySmall?.copyWith(
                            //     color: theme.colorScheme.onSurface.withValues(
                            //       alpha: 0.6,
                            //     ),
                            //   ),
                            // ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 40),

            // Content Sections (Using standalone class)
            PrivacySection(
              fadeAnimation: _fadeAnimations[1],
              slideAnimation: _slideAnimations[1],
              title: '1. Information We Collect',
              content:
                  'We collect information that you provide directly to us, including your name, email address, employee ID, and profile photograph. We also collect data related to your professional training and clearance statuses as part of the Bright Horizons platform.',
            ),
            PrivacySection(
              fadeAnimation: _fadeAnimations[2],
              slideAnimation: _slideAnimations[2],
              title: '2. How We Use Your Data',
              content:
                  'Your information is used to manage your professional profile, track compliance requirements, facilitate workspace management, and ensure the security of the healthcare environment. We do not sell your personal data to third parties.',
            ),
            PrivacySection(
              fadeAnimation: _fadeAnimations[3],
              slideAnimation: _slideAnimations[3],
              title: '3. Data Retention & Deletion',
              content:
                  'We retain your personal data for as long as your account is active. If you choose to delete your account, your data will enter a 30-day "Pending Deletion" period, after which it will be permanently removed from our active systems, subject to legal retention requirements.',
            ),
            PrivacySection(
              fadeAnimation: _fadeAnimations[4],
              slideAnimation: _slideAnimations[4],
              title: '4. Security Measures',
              content:
                  'We implement industry-standard technical and organizational measures to protect your data, including end-to-end encryption for sensitive data and mandatory multi-factor authentication triggers for critical account changes.',
            ),
            PrivacySection(
              fadeAnimation: _fadeAnimations[5],
              slideAnimation: _slideAnimations[5],
              title: '5. Your Rights',
              content:
                  'You have the right to access, correct, or request the deletion of your personal data at any time through your profile settings. For cascading workspace deletions, please contact your workspace administrator.',
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// --- STANDALONE UI COMPONENT: PRIVACY SECTION ---
// =============================================================================

class PrivacySection extends StatelessWidget {
  final Animation<double> fadeAnimation;
  final Animation<Offset> slideAnimation;
  final String title;
  final String content;

  const PrivacySection({
    super.key,
    required this.fadeAnimation,
    required this.slideAnimation,
    required this.title,
    required this.content,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return FadeTransition(
      opacity: fadeAnimation,
      child: SlideTransition(
        position: slideAnimation,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                content,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.8),
                  height: 1.6,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
