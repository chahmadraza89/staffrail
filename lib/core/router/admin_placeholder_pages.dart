import 'package:flutter/material.dart';

class AdminPlaceholderPage extends StatelessWidget {
  final String title;
  const AdminPlaceholderPage({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Color(0xFF6B8A8A),
          ),
        ),
      ),
    );
  }
}
