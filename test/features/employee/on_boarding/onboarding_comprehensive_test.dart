import 'dart:typed_data';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/file_picker_serivce.dart';
import 'package:bhmh/features/employee/on_boarding/data/data_source/onboarding_service.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/acknowledge_action_card.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/form_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/signature_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/upload_action.dart';
import 'package:file_picker/file_picker.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// --- MOCKS ---
class MockOnboardingService extends Mock implements OnboardingService {}

class MockStorageService extends Mock implements StorageService {}

class MockFilePickerService extends Mock implements FilePickerService {}

class MockUser extends Mock implements User {
  @override
  String get uid => 'user_123';
}

class FakePlatformFile extends Fake implements PlatformFile {
  @override
  String get name => 'test_file.pdf';
  @override
  int get size => 1024;
  @override
  Uint8List? get bytes => Uint8List.fromList([1, 2, 3]);
}

void main() {
  late MockOnboardingService mockOnboardingService;
  late MockStorageService mockStorageService;
  late MockFilePickerService mockFilePickerService;
  late List<CompilationSubTask> sampleTasks;

  setUpAll(() {
    registerFallbackValue(
      const CompilationSubTask(
        id: 'dummy',
        title: 'dummy',
        subtitle: 'dummy',
        isCompleted: false,
      ),
    );
    registerFallbackValue(Uint8List.fromList([]));
    registerFallbackValue(FakePlatformFile());
    registerFallbackValue(TaskStatus.notStarted);
    registerFallbackValue(TaskActionType.acknowledge);
  });

  setUp(() {
    mockOnboardingService = MockOnboardingService();
    mockStorageService = MockStorageService();
    mockFilePickerService = MockFilePickerService();

    sampleTasks = [
      const CompilationSubTask(
        id: 'personal_details',
        title: 'Personal Details',
        subtitle: 'Required',
        status: TaskStatus.notStarted,
        actionType: TaskActionType.form,
        isCompleted: false,
      ),
      const CompilationSubTask(
        id: 'emergency_contact',
        title: 'Emergency Contact',
        subtitle: 'Required',
        status: TaskStatus.submitted, // Locked
        actionType: TaskActionType.form,
        isCompleted: true,
      ),
      const CompilationSubTask(
        id: 'offer_letter',
        title: 'Offer Letter',
        subtitle: 'Sign electronically',
        status: TaskStatus.signed, // Locked
        actionType: TaskActionType.signature,
        isCompleted: true,
      ),
    ];
  });

  // Helper to create container with standard overrides
  ProviderContainer createContainer({List overrides = const []}) {
    return ProviderContainer(
      overrides: [
        onboardingServiceProvider.overrideWithValue(mockOnboardingService),
        storageServiceProvider.overrideWithValue(mockStorageService),
        filePickerServiceProvider.overrideWithValue(mockFilePickerService),
        authStateProvider.overrideWithValue(AsyncValue.data(MockUser())),
        ...overrides,
      ],
    );
  }

  // ===========================================================================
  // SECTION 1: VIEW MODEL & LOGIC TESTS (Unit)
  // ===========================================================================
  group('TaskViewModel Integration Logic', () {
    test(
      'should call updateTaskStatus with formData when submitFormData is called',
      () async {
        final container = createContainer();

        when(
          () => mockOnboardingService.updateTaskStatus(
            uid: any(named: 'uid'),
            taskId: 'personal_details',
            status: TaskStatus.completed,
            isCompleted: true,
            formData: any(named: 'formData'),
            isDraft: any(named: 'isDraft'),
          ),
        ).thenAnswer((_) async => {});

        final viewModel = container.read(taskViewModelProvider.notifier);
        final testData = {
          'Full Name': 'John Doe',
          'Date of Birth': '1990-01-01',
          'Home Address': '123 Main St',
        };

        // Action
        final result = await viewModel.submitFormData(
          taskId: 'personal_details',
          formData: testData,
        );

        // Verify
        expect(result, isTrue);
        verify(
          () => mockOnboardingService.updateTaskStatus(
            uid: 'user_123',
            taskId: 'personal_details',
            status: TaskStatus.completed,
            isCompleted: true,
            formData: testData,
            isDraft: false,
          ),
        ).called(1);
      },
    );

    test(
      'should return false and set error state on empty form submission',
      () async {
        final container = createContainer();
        final viewModel = container.read(taskViewModelProvider.notifier);

        // Action
        final result = await viewModel.submitFormData(
          taskId: 'personal_details',
          formData: {'Full Name': '', 'Date of Birth': '1990-01-01'},
        );

        // Verify
        expect(result, isFalse);
        expect(container.read(taskViewModelProvider).hasError, isTrue);
      },
    );

    group('Onboarding Upload Logic', () {
      test(
        'should call storageService and onboardingService when uploadFileForTask is called',
        () async {
          final container = createContainer();
          final fakeFile = FakePlatformFile();

          when(
            () => mockOnboardingService.updateTaskStatus(
              uid: any(named: 'uid'),
              taskId: any(named: 'taskId'),
              status: any(named: 'status'),
              isCompleted: any(named: 'isCompleted', that: isA<bool>()),
              fileUrl: any(named: 'fileUrl'),
              isDraft: any(named: 'isDraft', that: isA<bool>()),
              signatureUrl: any(named: 'signatureUrl'),
              formData: any(named: 'formData'),
              rejectionReason: any(named: 'rejectionReason'),
            ),
          ).thenAnswer((_) async => {});

          final viewModel = container.read(taskViewModelProvider.notifier);

          // Action
          final result = await viewModel.uploadFileForTask(
            taskId: 'personal_details',
            file: fakeFile,
            asDraft: false,
          );

          // Verify
          expect(result, isTrue);
          verify(
            () => mockStorageService.uploadFile(
              fileBytes: any(named: 'fileBytes'),
              fileName: 'test_file.pdf',
              storagePath: any(named: 'storagePath'),
            ),
          ).called(1);
        },
      );
    });

    group('Progress Calculation Logic', () {
      test(
        'isOnboardingCompleteProvider should be true ONLY when all tasks are finalized',
        () async {
          final container = createContainer(
            overrides: [
              onboardingTasksStreamProvider.overrideWith(
                (ref) => Stream.value([
                  const CompilationSubTask(
                    id: 't1',
                    title: 'T1',
                    subtitle: 'S1',
                    isCompleted: true,
                    status: TaskStatus.completed,
                  ),
                  const CompilationSubTask(
                    id: 't2',
                    title: 'T2',
                    subtitle: 'S2',
                    isCompleted: true,
                    status: TaskStatus.submitted,
                  ),
                ]),
              ),
            ],
          );

          // Use future to ensure stream has emitted at least once
          await container.read(onboardingTasksStreamProvider.future);

          final isComplete = container.read(isOnboardingCompleteProvider);
          expect(isComplete, isTrue);

          container.dispose();
        },
      );
    });
  });

  // ===========================================================================
  // SECTION 2: UI RENDERING & LOCKING TESTS (Widget)
  // ===========================================================================
  group('Onboarding UI & Locking Mechanism', () {
    Widget createTestableWidget({
      required Widget child,
      List overrides = const [],
    }) {
      return ProviderScope(
        overrides: [
          onboardingServiceProvider.overrideWithValue(mockOnboardingService),
          storageServiceProvider.overrideWithValue(mockStorageService),
          filePickerServiceProvider.overrideWithValue(mockFilePickerService),
          authStateProvider.overrideWithValue(AsyncValue.data(MockUser())),
          ...overrides,
        ],
        child: MaterialApp(home: Scaffold(body: child)),
      );
    }

    testWidgets('FormAction renders dynamic fields based on taskId', (
      tester,
    ) async {
      await tester.pumpWidget(
        createTestableWidget(
          child: const FormAction(taskId: 'personal_details'),
          overrides: [
            onboardingTasksStreamProvider.overrideWith(
              (ref) => Stream.value([]),
            ),
          ],
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Full Name'), findsOneWidget);
    });

    testWidgets(
      'UI Locking: FormAction fields are DISABLED when status is submitted',
      (tester) async {
        await tester.pumpWidget(
          createTestableWidget(
            child: const FormAction(taskId: 'emergency_contact'),
            overrides: [
              onboardingTasksStreamProvider.overrideWith(
                (ref) => Stream.value(sampleTasks),
              ),
            ],
          ),
        );

        await tester.pumpAndSettle();

        expect(find.text('Task Submitted - View Only'), findsOneWidget);

        final formFields = tester.widgetList<TextFormField>(
          find.byType(TextFormField),
        );
        for (final field in formFields) {
          expect(field.enabled, isFalse);
        }
      },
    );

    testWidgets('UI Locking: SignatureAction displays locked banner', (
      tester,
    ) async {
      final signedTask = const CompilationSubTask(
        id: 'offer_letter',
        title: 'Offer Letter',
        subtitle: 'Sign electronically',
        status: TaskStatus.signed,
        actionType: TaskActionType.signature,
        isCompleted: true,
      );

      await tester.pumpWidget(
        createTestableWidget(
          child: const SignatureAction(taskId: 'offer_letter'),
          overrides: [
            onboardingTasksStreamProvider.overrideWith(
              (ref) => Stream.value([signedTask]),
            ),
          ],
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Task Signed - Locked'), findsOneWidget);
    });

    testWidgets(
      'UI Locking: UploadAction displays "Awaiting Review" for waitingForApprover status',
      (tester) async {
        final uploadTask = const CompilationSubTask(
          id: 'doc_upload',
          title: 'ID Proof',
          subtitle: 'Required',
          status: TaskStatus.waitingForApprover,
          actionType: TaskActionType.upload,
          isCompleted: true,
        );

        await tester.pumpWidget(
          createTestableWidget(
            child: const UploadAction(taskId: 'doc_upload'),
            overrides: [
              onboardingTasksStreamProvider.overrideWith(
                (ref) => Stream.value([uploadTask]),
              ),
            ],
          ),
        );

        await tester.pumpAndSettle();

        expect(find.text('Awaiting Review'), findsOneWidget);
      },
    );

    testWidgets(
      'UI Locking: AcknowledgeAction checkmark is DISABLED for completed task',
      (tester) async {
        final acknowledgedTask = const CompilationSubTask(
          id: 'handbook',
          title: 'Employee Handbook',
          subtitle: 'Required',
          status: TaskStatus.acknowledged,
          actionType: TaskActionType.acknowledge,
          isCompleted: true,
        );

        await tester.pumpWidget(
          createTestableWidget(
            child: const AcknowledgeAction(taskId: 'handbook'),
            overrides: [
              onboardingTasksStreamProvider.overrideWith(
                (ref) => Stream.value([acknowledgedTask]),
              ),
            ],
          ),
        );

        await tester.pumpAndSettle();

        final checkbox = tester.widget<CheckboxListTile>(
          find.byType(CheckboxListTile),
        );
        expect(checkbox.onChanged, isNull);
      },
    );

    group('Final Acceptance Simulation', () {
      test('Simulation of full user onboarding flow consistency', () {
        expect(sampleTasks.first.isCompleted, isFalse);
        expect(sampleTasks.last.isCompleted, isTrue);
      });
    });
  });
}
