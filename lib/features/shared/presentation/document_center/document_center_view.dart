import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DocumentCenterView extends ConsumerWidget {
  const DocumentCenterView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Document Center'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Folders',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _FolderCard(
                    title: 'Onboarding',
                    itemCount: 8,
                    icon: Icons.assignment_ind_rounded,
                    color: Colors.blue.shade100,
                    iconColor: Colors.blue.shade700,
                  ),
                  _FolderCard(
                    title: 'Clearance',
                    itemCount: 4,
                    icon: Icons.verified_user_rounded,
                    color: Colors.green.shade100,
                    iconColor: Colors.green.shade700,
                  ),
                  _FolderCard(
                    title: 'Trainings',
                    itemCount: 12,
                    icon: Icons.school_rounded,
                    color: Colors.purple.shade100,
                    iconColor: Colors.purple.shade700,
                  ),
                  _FolderCard(
                    title: 'Shared',
                    itemCount: 2,
                    icon: Icons.folder_shared_rounded,
                    color: Colors.orange.shade100,
                    iconColor: Colors.orange.shade700,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        label: const Text('Upload Document'),
        icon: const Icon(Icons.cloud_upload_rounded),
        backgroundColor: const Color(0xFF109B85),
      ),
    );
  }
}

class _FolderCard extends StatelessWidget {
  final String title;
  final int itemCount;
  final IconData icon;
  final Color color;
  final Color iconColor;

  const _FolderCard({
    required this.title,
    required this.itemCount,
    required this.icon,
    required this.color,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: iconColor, size: 24),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$itemCount items',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
