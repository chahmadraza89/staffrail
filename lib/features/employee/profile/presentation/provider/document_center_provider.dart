import 'package:bhmh/core/config/firebase_collection_constant.dart' as firebase_const;
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/data/model/document_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rxdart/rxdart.dart';

final documentCenterProvider = StreamProvider.autoDispose<List<AppDocument>>((ref) {
  final userAsync = ref.watch(currentUserProvider);
  final uid = userAsync.value?.uid;

  if (uid == null) return Stream.value([]);

  final firestore = FirebaseFirestore.instance;
  final userDoc = firestore.collection(firebase_const.users).doc(uid);

  // 1. Onboarding Documents
  final onboardingStream = userDoc
      .collection(firebase_const.onboardingTasks)
      .where('fileUrl', isNotEqualTo: null)
      .snapshots()
      .map((snapshot) => snapshot.docs
          .where((doc) => doc.data()['fileUrl'] != null && doc.data()['fileUrl'].toString().trim().isNotEmpty)
          .map((doc) {
            final data = doc.data();
            return AppDocument(
              id: doc.id,
              title: data['title']?.toString() ?? 'Onboarding Document',
              url: data['fileUrl'].toString(),
              category: DocumentCategory.onboarding,
              uploadedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
            );
          }).toList());

  // 2. Clearance Documents
  // final clearanceStream = userDoc
  //     .collection(firebase_const.clearanceItems)
  //     .where('fileUrl', isNotEqualTo: null)
  //     .snapshots()
  //     .map((snapshot) => snapshot.docs
  //         .where((doc) => doc.data()['fileUrl'] != null && doc.data()['fileUrl'].toString().trim().isNotEmpty)
  //         .map((doc) {
  //           final data = doc.data();
  //           return AppDocument(
  //             id: doc.id,
  //             title: data['title']?.toString() ?? 'Clearance Document',
  //             url: data['fileUrl'].toString(),
  //             // category: DocumentCategory.clearance, // Commented out from enum
  //             category: DocumentCategory.personal, // Fallback placeholder if uncommented
  //             uploadedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
  //           );
  //         }).toList());

  // 3. Training Certificates
  final trainingStream = userDoc
      .collection(firebase_const.trainings)
      .where('certificateUrl', isNotEqualTo: null)
      .snapshots()
      .map((snapshot) => snapshot.docs
          .where((doc) => doc.data()['certificateUrl'] != null && doc.data()['certificateUrl'].toString().trim().isNotEmpty)
          .map((doc) {
            final data = doc.data();
            return AppDocument(
              id: doc.id,
              title: data['title']?.toString() ?? 'Training Certificate',
              url: data['certificateUrl'].toString(),
              category: DocumentCategory.training,
              uploadedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
            );
          }).toList());

  // 4. Combine all streams
  return Rx.combineLatest2(
    onboardingStream,
    // clearanceStream,
    trainingStream,
    (onboarding, training) {
      final allDocs = [...onboarding, ...training];
      allDocs.sort((a, b) => b.uploadedAt.compareTo(a.uploadedAt));
      return allDocs;
    },
  );
});

final documentFoldersProvider = Provider.autoDispose<Map<DocumentCategory, List<AppDocument>>>((ref) {
  final docs = ref.watch(documentCenterProvider).value ?? [];
  final Map<DocumentCategory, List<AppDocument>> folders = {
    DocumentCategory.onboarding: [],
    // DocumentCategory.clearance: [],
    DocumentCategory.training: [],
    DocumentCategory.personal: [],
  };

  for (var doc in docs) {
    folders[doc.category]?.add(doc);
  }

  return folders;
});
