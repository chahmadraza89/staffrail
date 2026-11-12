import 'package:bhmh/core/config/firebase_collection_constant.dart' as store_const;
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/data/model/document_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rxdart/rxdart.dart';

final documentCenterProvider = StreamProvider.autoDispose<List<AppDocument>>((ref) {
  final userAsync = ref.watch(currentUserProvider);
  final uid = userAsync.value?.uid;

  if (uid == null) return Stream.value([]);

  final store = LocalDataStore.instance;
  final userDoc = store.collection(store_const.users).doc(uid);

  final onboardingStream = userDoc
      .collection(store_const.onboardingTasks)
      .where('fileUrl', isNotEqualTo: null)
      .snapshots()
      .map((snapshot) => snapshot.docs
          .where((doc) => doc.data()['fileUrl'] != null && doc.data()['fileUrl'].toString().trim().isNotEmpty)
          .map((doc) {
            final data = doc.data();
            final rawUpdated = data['updatedAt'];
            return AppDocument(
              id: doc.id,
              title: data['title']?.toString() ?? 'Onboarding Document',
              url: data['fileUrl'].toString(),
              category: DocumentCategory.onboarding,
              uploadedAt: rawUpdated is LocalTimestamp ? rawUpdated.toDate() : DateTime.now(),
            );
          }).toList());

  final trainingStream = userDoc
      .collection(store_const.trainings)
      .where('certificateUrl', isNotEqualTo: null)
      .snapshots()
      .map((snapshot) => snapshot.docs
          .where((doc) => doc.data()['certificateUrl'] != null && doc.data()['certificateUrl'].toString().trim().isNotEmpty)
          .map((doc) {
            final data = doc.data();
            final rawUpdated = data['updatedAt'];
            return AppDocument(
              id: doc.id,
              title: data['title']?.toString() ?? 'Training Certificate',
              url: data['certificateUrl'].toString(),
              category: DocumentCategory.training,
              uploadedAt: rawUpdated is LocalTimestamp ? rawUpdated.toDate() : DateTime.now(),
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
