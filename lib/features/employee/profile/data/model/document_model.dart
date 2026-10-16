import 'package:equatable/equatable.dart';

enum DocumentCategory {
  onboarding('Onboarding'),
  // clearance('Clearance'),
  training('Training'),
  personal('Personal');

  final String label;
  const DocumentCategory(this.label);
}

class AppDocument extends Equatable {
  final String id;
  final String title;
  final String url;
  final DocumentCategory category;
  final DateTime uploadedAt;
  final String? size;
  final String? mimeType;

  const AppDocument({
    required this.id,
    required this.title,
    required this.url,
    required this.category,
    required this.uploadedAt,
    this.size,
    this.mimeType,
  });

  @override
  List<Object?> get props => [id, title, url, category, uploadedAt, size, mimeType];
}
