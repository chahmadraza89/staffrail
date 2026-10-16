import 'package:flutter/material.dart';

/// Global key for accessing ScaffoldMessenger from anywhere in the app.
/// This prevents 'disposed context' errors on Flutter Web and Mobile.
final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
