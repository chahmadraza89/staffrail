import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/profile/data/model/document_model.dart';
import 'package:bhmh/features/employee/profile/presentation/provider/document_center_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

class DocumentCenterScreen extends ConsumerWidget {
  const DocumentCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final folders = ref.watch(documentFoldersProvider);
    final asyncDocs = ref.watch(documentCenterProvider);

    return Scaffold(
      appBar: CustomBar(
        title: Text(
          'Document Center',
          style: context.titleLarge.copyWith(
            fontWeight: FontWeight.w800,
            color: AppColors.primaryColor,
          ),
        ),
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(UserRoutes.profile);
          }
        },
      ),
      body: asyncDocs.when(
        data: (_) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            DocumentFolderTile(
              category: DocumentCategory.onboarding,
              docs: folders[DocumentCategory.onboarding] ?? [],
              icon: LucideIcons.fileText,
              color: const Color(0xFF3B82F6),
            ),
            // DocumentFolderTile(
            //   category: DocumentCategory.clearance,
            //   docs: folders[DocumentCategory.clearance] ?? [],
            //   icon: LucideIcons.shieldCheck,
            //   color: const Color(0xFF10B981),
            // ),
            DocumentFolderTile(
              category: DocumentCategory.training,
              docs: folders[DocumentCategory.training] ?? [],
              icon: LucideIcons.award,
              color: const Color(0xFF8B5CF6),
            ),
            DocumentFolderTile(
              category: DocumentCategory.personal,
              docs: folders[DocumentCategory.personal] ?? [],
              icon: LucideIcons.folder,
              color: const Color(0xFF64748B),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error loading documents: $e')),
      ),
    );
  }
}

// =============================================================================
// --- FOLDER TILE COMPONENT ---
// =============================================================================

class DocumentFolderTile extends StatelessWidget {
  final DocumentCategory category;
  final List<AppDocument> docs;
  final IconData icon;
  final Color color;

  const DocumentFolderTile({
    super.key,
    required this.category,
    required this.docs,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
          ),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          title: Text(
            category.label,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: Color(0xFF0F172A),
            ),
          ),
          subtitle: Text(
            '${docs.length} Items',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
          ),
          children: [
            if (docs.isEmpty)
              const Padding(
                padding: EdgeInsets.all(20.0),
                child: Text(
                  'No documents found in this folder.',
                  style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                ),
              ),
            ...docs.map((doc) => DocumentItemTile(doc: doc)),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// --- DOCUMENT ITEM TILE COMPONENT ---
// =============================================================================

class DocumentItemTile extends StatelessWidget {
  final AppDocument doc;

  const DocumentItemTile({super.key, required this.doc});

  Future<void> _viewDocument(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.file, size: 18, color: Color(0xFF64748B)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doc.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155),
                  ),
                ),
                Text(
                  'Uploaded ${doc.uploadedAt.day}/${doc.uploadedAt.month}/${doc.uploadedAt.year}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(
              LucideIcons.eye,
              size: 18,
              color: Color(0xFF109B85),
            ),
            onPressed: () => _viewDocument(doc.url),
          ),
        ],
      ),
    );
  }
}
