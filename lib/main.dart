import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as store_constants;
import 'package:bhmh/core/config/organization_config.dart';
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/router/app_router.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/shared/scaffold_messenger_key.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize local notification service without any remote push/database SDK.
  await NotificationService().initialize();

  NotificationService().setNotificationTapCallback((message) {
    debugPrint('Navigating from notification tap: ${message.data}');
  });

  // Record a local device token on startup/login in the database-free store.
  LocalAuth.instance.authStateChanges().listen((user) async {
    if (user != null) {
      final token = await NotificationService().getToken();
      if (token != null) {
        try {
          await LocalDataStore.instance
              .collection(store_constants.users)
              .doc(user.uid)
              .set({'fcmToken': token}, const LocalSetOptions(merge: true));
        } catch (e) {
          debugPrint('Notification Token Update Error: $e');
        }
      }
    }
  });

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      scaffoldMessengerKey: scaffoldMessengerKey,
      debugShowCheckedModeBanner: false,
      title: OrganizationConfig.appName,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
