import 'package:bhmh/core/shared/scaffold_messenger_key.dart';
import 'package:bhmh/core/router/app_router.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_constants;
import 'core/config/firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized(); 

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Initialize notification service with tap handling
  await NotificationService().initialize();

  // Set up notification tap callback for navigation
  NotificationService().setNotificationTapCallback((message) {
    debugPrint("Navigating from notification tap: ${message.data}");

    // Example: Navigate to notifications page or specific message detail
  });

  // Save the FCM token for the current user automatically on startup or login
  FirebaseAuth.instance.authStateChanges().listen((user) async {
    if (user != null) {
      final token = await NotificationService().getToken();
      if (token != null) {
        try {
          await FirebaseFirestore.instance
              .collection(firebase_constants.users)
              .doc(user.uid)
              .set({'fcmToken': token}, SetOptions(merge: true));
        } catch (e) {
          debugPrint("FCM Update Error: $e");
        }
      }
    }
  });

  // final prefs = await SharedPreferences.getInstance();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    const ProviderScope(
      // overrides: [sharedPrefsProvider.overrideWithValue(prefs)],
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      scaffoldMessengerKey: scaffoldMessengerKey,
      debugShowCheckedModeBanner: false,
      title: 'BHMH',
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
