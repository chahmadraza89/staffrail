// import 'package:bhmh/core/router/app_routes_constant.dart';
// import 'package:bhmh/features/splash_screen/onboarding/custom_painter_preview.dart';
// import 'package:flutter/material.dart';
// import 'package:flutter_riverpod/flutter_riverpod.dart';
// import 'package:go_router/go_router.dart';

// class PreviewScreen2 extends ConsumerStatefulWidget {
//   const PreviewScreen2({super.key});

//   @override
//   ConsumerState<PreviewScreen2> createState() => _PreviewScreen2State();
// }

// class _PreviewScreen2State extends ConsumerState<PreviewScreen2>
//     with SingleTickerProviderStateMixin {
//   late AnimationController _controller;

//   late Animation<double> _imageFade;
//   late Animation<double> _imageScale;

//   late Animation<double> _titleFade;
//   late Animation<Offset> _titleSlide;

//   late Animation<double> _descFade;
//   late Animation<Offset> _descSlide;

//   late Animation<double> _controlsFade;

//   @override
//   void initState() {
//     super.initState();

//     _controller = AnimationController(
//       vsync: this,
//       duration: const Duration(milliseconds: 800),
//     );

//     _imageFade = Tween<double>(begin: 0.0, end: 1.0).animate(
//       CurvedAnimation(
//         parent: _controller,
//         curve: const Interval(0.0, 0.5, curve: Curves.easeOutSine),
//       ),
//     );
//     _imageScale = Tween<double>(begin: 0.95, end: 1.0).animate(
//       CurvedAnimation(
//         parent: _controller,
//         curve: const Interval(0.0, 0.5, curve: Curves.easeOutSine),
//       ),
//     );

//     _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
//       CurvedAnimation(
//         parent: _controller,
//         curve: const Interval(0.2, 0.7, curve: Curves.easeOutSine),
//       ),
//     );
//     _titleSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
//         .animate(
//           CurvedAnimation(
//             parent: _controller,
//             curve: const Interval(0.2, 0.7, curve: Curves.easeOutSine),
//           ),
//         );

//     _descFade = Tween<double>(begin: 0.0, end: 1.0).animate(
//       CurvedAnimation(
//         parent: _controller,
//         curve: const Interval(0.4, 0.9, curve: Curves.easeOutSine),
//       ),
//     );
//     _descSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
//         .animate(
//           CurvedAnimation(
//             parent: _controller,
//             curve: const Interval(0.4, 0.9, curve: Curves.easeOutSine),
//           ),
//         );

//     _controlsFade = Tween<double>(begin: 0.0, end: 1.0).animate(
//       CurvedAnimation(
//         parent: _controller,
//         curve: const Interval(0.7, 1.0, curve: Curves.easeInSine),
//       ),
//     );

//     _controller.forward();
//   }

//   @override
//   void dispose() {
//     _controller.dispose();
//     super.dispose();
//   }

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);

//     return Scaffold(
//       backgroundColor: theme.scaffoldBackgroundColor,
//       body: SafeArea(
//         child: AnimatedBuilder(
//           animation: _controller,
//           builder: (context, child) {
//             return Padding(
//               padding: const EdgeInsets.symmetric(
//                 horizontal: 24.0,
//                 vertical: 32.0,
//               ),
//               child: Column(
//                 crossAxisAlignment: CrossAxisAlignment.stretch,
//                 children: [
//                   Align(
//                     alignment: Alignment.topRight,
//                     child: TextButton(
//                       onPressed: () => context.goNamed(AuthRouteNames.login),
//                       child: Text(
//                         'Skip',
//                         style: theme.textTheme.bodyLarge?.copyWith(
//                           color: theme.colorScheme.primary.withValues(alpha: 0.8),
//                           fontWeight: FontWeight.w600,
//                         ),
//                       ),
//                     ),
//                   ),
//                   const Spacer(flex: 1),

//                   // 1. Animated Icon Area
//                   FadeTransition(
//                     opacity: _imageFade,
//                     child: ScaleTransition(
//                       scale: _imageScale,
//                       child: AnimatedOnboardingIcon(
//                         icon: Icons.school_rounded,
//                         iconColor: theme.colorScheme.primary,
//                         backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.15,
//                         ),
//                       ),
//                     ),
//                   ),

//                   const Spacer(flex: 1),

//                   // 2. Animated Title
//                   FadeTransition(
//                     opacity: _titleFade,
//                     child: SlideTransition(
//                       position: _titleSlide,
//                       child: Text(
//                         'Manage Training',
//                         textAlign: TextAlign.center,
//                         style: theme.textTheme.headlineMedium?.copyWith(
//                           color: theme.colorScheme.onSurface,
//                           fontWeight: FontWeight.bold,
//                           letterSpacing: 0.5,
//                         ),
//                       ),
//                     ),
//                   ),

//                   const SizedBox(height: 16),

//                   // 3. Animated Description
//                   FadeTransition(
//                     opacity: _descFade,
//                     child: SlideTransition(
//                       position: _descSlide,
//                       child: Text(
//                         'Access required training modules, track completion status, and stay compliant with healthcare regulations.',
//                         textAlign: TextAlign.center,
//                         style: theme.textTheme.bodyLarge?.copyWith(
//                           color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
//                           height: 1.5,
//                         ),
//                       ),
//                     ),
//                   ),

//                   const Spacer(flex: 2),

//                   // 4. Controls
//                   FadeTransition(
//                     opacity: _controlsFade,
//                     child: Row(
//                       mainAxisAlignment: MainAxisAlignment.spaceBetween,
//                       children: [
//                         const Row(
//                           children: [
//                             PillProgressIndicator(isActive: false),
//                             SizedBox(width: 8),
//                             PillProgressIndicator(isActive: true),
//                             SizedBox(width: 8),
//                             PillProgressIndicator(isActive: false),
//                           ],
//                         ),

//                         FilledButton(
//                           style: FilledButton.styleFrom(
//                             padding: const EdgeInsets.symmetric(
//                               horizontal: 32,
//                               vertical: 16,
//                             ),
//                             shape: RoundedRectangleBorder(
//                               borderRadius: BorderRadius.circular(30),
//                             ),
//                           ),
//                           onPressed: () {
//                             context.goNamed(OnBoardingRouteNames.preview3);
//                           },
//                           child: const Text('Next'),
//                         ),
//                       ],
//                     ),
//                   ),
//                 ],
//               ),
//             );
//           },
//         ),
//       ),
//     );
//   }
// }

// // =============================================================================
// // --- STANDALONE PILL INDICATOR COMPONENT ---
// // =============================================================================

// class PillProgressIndicator extends StatelessWidget {
//   final bool isActive;

//   const PillProgressIndicator({super.key, required this.isActive});

//   @override
//   Widget build(BuildContext context) {
//     final theme = Theme.of(context);

//     return AnimatedContainer(
//       duration: const Duration(milliseconds: 300),
//       height: 8,
//       width: isActive ? 24 : 8,
//       decoration: BoxDecoration(
//         color: isActive
//             ? theme.colorScheme.primary
//             : theme.colorScheme.primary.withValues(alpha: 0.2),
//         borderRadius: BorderRadius.circular(4),
//       ),
//     );
//   }
// }
