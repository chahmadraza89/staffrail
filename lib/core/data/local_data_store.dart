import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:bhmh/core/config/organization_config.dart';

/// Exception thrown by local database-free store, auth, storage, and actions.
class LocalDataException implements Exception {
  final String plugin;
  final String code;
  final String? message;

  LocalDataException({
    this.plugin = 'local_store',
    required this.code,
    this.message,
  });

  @override
  String toString() => '[$plugin/$code] ${message ?? code}';
}

/// Sentinel returned by [LocalFieldValue.serverTimestamp].
class _ServerTimestampSentinel {
  const _ServerTimestampSentinel();
}

class LocalFieldValue {
  LocalFieldValue._();

  static Object serverTimestamp() => const _ServerTimestampSentinel();
}

class LocalSetOptions {
  final bool merge;

  const LocalSetOptions({this.merge = false});
}

/// Pure-Dart timestamp compatible with legacy Timestamp serialization.
class LocalTimestamp implements Comparable<LocalTimestamp> {
  final DateTime _date;

  LocalTimestamp(this._date);

  factory LocalTimestamp.fromDate(DateTime date) => LocalTimestamp(date);

  factory LocalTimestamp.fromMillisecondsSinceEpoch(int milliseconds) =>
      LocalTimestamp(DateTime.fromMillisecondsSinceEpoch(milliseconds));

  factory LocalTimestamp.now() => LocalTimestamp(DateTime.now());

  DateTime toDate() => _date;

  int get millisecondsSinceEpoch => _date.millisecondsSinceEpoch;

  int get seconds => _date.millisecondsSinceEpoch ~/ 1000;

  int get nanoseconds => (_date.millisecondsSinceEpoch % 1000) * 1000000;

  @override
  int compareTo(LocalTimestamp other) => _date.compareTo(other._date);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocalTimestamp && _date == other._date;

  @override
  int get hashCode => _date.hashCode;

  @override
  String toString() => 'LocalTimestamp(${_date.toIso8601String()})';
}

abstract class LocalDocumentSnapshot<T> {
  String get id;
  String get path;
  LocalDocumentReference<Map<String, dynamic>> get reference;
  bool get exists;
  T? data();
  dynamic operator [](Object field);
}

abstract class LocalQueryDocumentSnapshot<T>
    extends LocalDocumentSnapshot<T> {
  @override
  T data();
}

abstract class LocalQuerySnapshot<T> {
  List<LocalQueryDocumentSnapshot<T>> get docs;
}

class _InMemoryQueryDocumentSnapshot<T> extends LocalQueryDocumentSnapshot<T> {
  @override
  final String id;

  @override
  final String path;

  @override
  final LocalDocumentReference<Map<String, dynamic>> reference;

  final T _value;

  _InMemoryQueryDocumentSnapshot({
    required this.id,
    required this.path,
    required this.reference,
    required T value,
  }) : _value = value;

  @override
  bool get exists => true;

  @override
  T data() => _value;

  @override
  dynamic operator [](Object field) {
    final value = _value;
    if (value is Map<String, dynamic> && field is String) {
      return value[field];
    }
    return null;
  }
}

class _InMemoryDocumentSnapshot<T> extends LocalDocumentSnapshot<T> {
  @override
  final String id;

  @override
  final String path;

  @override
  final LocalDocumentReference<Map<String, dynamic>> reference;

  final T? _value;

  @override
  final bool exists;

  _InMemoryDocumentSnapshot({
    required this.id,
    required this.path,
    required this.reference,
    required this.exists,
    required T? value,
  }) : _value = value;

  @override
  T? data() => exists ? _value : null;

  @override
  dynamic operator [](Object field) {
    final value = data();
    if (value is Map<String, dynamic> && field is String) {
      return value[field];
    }
    return null;
  }
}

class _InMemoryQuerySnapshot<T> extends LocalQuerySnapshot<T> {
  @override
  final List<LocalQueryDocumentSnapshot<T>> docs;

  _InMemoryQuerySnapshot(this.docs);
}

class _WhereClause {
  final String field;
  final Object? isEqualTo;
  final Object? isNotEqualTo;
  final bool hasNotEqualTo;
  final Object? isLessThan;
  final Object? isLessThanOrEqualTo;
  final Object? isGreaterThan;
  final Object? isGreaterThanOrEqualTo;
  final Object? arrayContains;
  final Iterable<Object?>? arrayContainsAny;
  final Iterable<Object?>? whereIn;
  final Iterable<Object?>? whereNotIn;
  final bool? isNull;

  const _WhereClause({
    required this.field,
    this.isEqualTo,
    this.isNotEqualTo,
    this.hasNotEqualTo = false,
    this.isLessThan,
    this.isLessThanOrEqualTo,
    this.isGreaterThan,
    this.isGreaterThanOrEqualTo,
    this.arrayContains,
    this.arrayContainsAny,
    this.whereIn,
    this.whereNotIn,
    this.isNull,
  });

  bool matches(Map<String, dynamic> doc) {
    final val = doc[field];
    if (isNull != null) {
      if (isNull! && val != null) return false;
      if (!isNull! && val == null) return false;
    }
    if (isEqualTo != null && val != _normalizeComparable(isEqualTo)) {
      return false;
    }
    if (hasNotEqualTo && val == _normalizeComparable(isNotEqualTo)) {
      return false;
    }
    if (isLessThan != null &&
        !(_compareDynamic(val, _normalizeComparable(isLessThan)) < 0)) {
      return false;
    }
    if (isLessThanOrEqualTo != null &&
        !(_compareDynamic(val, _normalizeComparable(isLessThanOrEqualTo)) <=
            0)) {
      return false;
    }
    if (isGreaterThan != null &&
        !(_compareDynamic(val, _normalizeComparable(isGreaterThan)) > 0)) {
      return false;
    }
    if (isGreaterThanOrEqualTo != null &&
        !(_compareDynamic(val, _normalizeComparable(isGreaterThanOrEqualTo)) >=
            0)) {
      return false;
    }
    if (arrayContains != null) {
      if (val is! List || !val.contains(_normalizeComparable(arrayContains))) {
        return false;
      }
    }
    final anyOf = arrayContainsAny;
    if (anyOf != null) {
      if (val is! List ||
          !anyOf
              .map(_normalizeComparable)
              .any((element) => val.contains(element))) {
        return false;
      }
    }
    final inList = whereIn;
    if (inList != null) {
      final allowed = inList.map(_normalizeComparable).toSet();
      if (!allowed.contains(val)) return false;
    }
    final notInList = whereNotIn;
    if (notInList != null) {
      final excluded = notInList.map(_normalizeComparable).toSet();
      if (excluded.contains(val)) return false;
    }
    return true;
  }
}

class _OrderClause {
  final String field;
  final bool descending;

  const _OrderClause(this.field, {this.descending = false});
}

Object? _normalizeComparable(Object? v) {
  if (v is DateTime) return LocalTimestamp(v);
  return v;
}

int _compareDynamic(dynamic a, dynamic b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  final na = a is DateTime ? LocalTimestamp(a) : a;
  final nb = b is DateTime ? LocalTimestamp(b) : b;
  if (na is LocalTimestamp && nb is LocalTimestamp) {
    return na.compareTo(nb);
  }
  if (na is num && nb is num) return na.compareTo(nb);
  if (na is String && nb is String) return na.compareTo(nb);
  if (na is Comparable && nb.runtimeType == na.runtimeType) {
    return na.compareTo(nb);
  }
  return na.toString().compareTo(nb.toString());
}

class LocalQuery<T> {
  final LocalDataStore _store;
  final String? _collectionPath;
  final String? _collectionGroupId;
  final List<_WhereClause> _wheres;
  final List<_OrderClause> _orders;
  final int? _limit;

  const LocalQuery._({
    required LocalDataStore store,
    String? collectionPath,
    String? collectionGroupId,
    List<_WhereClause> wheres = const [],
    List<_OrderClause> orders = const [],
    int? limit,
  }) : _store = store,
       _collectionPath = collectionPath,
       _collectionGroupId = collectionGroupId,
       _wheres = wheres,
       _orders = orders,
       _limit = limit;

  LocalQuery<T> where(
    Object field, {
    Object? isEqualTo,
    Object? isNotEqualTo,
    Object? isLessThan,
    Object? isLessThanOrEqualTo,
    Object? isGreaterThan,
    Object? isGreaterThanOrEqualTo,
    Object? arrayContains,
    Iterable<Object?>? arrayContainsAny,
    Iterable<Object?>? whereIn,
    Iterable<Object?>? whereNotIn,
    bool? isNull,
  }) {
    return LocalQuery<T>._(
      store: _store,
      collectionPath: _collectionPath,
      collectionGroupId: _collectionGroupId,
      wheres: [
        ..._wheres,
        _WhereClause(
          field: field.toString(),
          isEqualTo: isEqualTo,
          isNotEqualTo: isNotEqualTo,
          hasNotEqualTo: isNotEqualTo != null,
          isLessThan: isLessThan,
          isLessThanOrEqualTo: isLessThanOrEqualTo,
          isGreaterThan: isGreaterThan,
          isGreaterThanOrEqualTo: isGreaterThanOrEqualTo,
          arrayContains: arrayContains,
          arrayContainsAny: arrayContainsAny,
          whereIn: whereIn,
          whereNotIn: whereNotIn,
          isNull: isNull,
        ),
      ],
      orders: _orders,
      limit: _limit,
    );
  }

  LocalQuery<T> orderBy(Object field, {bool descending = false}) {
    return LocalQuery<T>._(
      store: _store,
      collectionPath: _collectionPath,
      collectionGroupId: _collectionGroupId,
      wheres: _wheres,
      orders: [..._orders, _OrderClause(field.toString(), descending: descending)],
      limit: _limit,
    );
  }

  LocalQuery<T> limit(int count) {
    return LocalQuery<T>._(
      store: _store,
      collectionPath: _collectionPath,
      collectionGroupId: _collectionGroupId,
      wheres: _wheres,
      orders: _orders,
      limit: count,
    );
  }

  LocalQuerySnapshot<T> _evaluate() {
    final groupId = _collectionGroupId;
    final rawEntries = groupId != null
        ? _store._entriesForCollectionGroup(groupId)
        : _store._entriesForCollection(_collectionPath!);

    final matched = rawEntries.where((entry) {
      for (final clause in _wheres) {
        if (!clause.matches(entry.value)) return false;
      }
      return true;
    }).toList();

    if (_orders.isNotEmpty) {
      matched.sort((a, b) {
        for (final order in _orders) {
          final cmp = _compareDynamic(a.value[order.field], b.value[order.field]);
          if (cmp != 0) return order.descending ? -cmp : cmp;
        }
        return 0;
      });
    }

    final limitCount = _limit;
    final limited = limitCount != null && matched.length > limitCount
        ? matched.sublist(0, limitCount)
        : matched;

    final docs = limited.map((entry) {
      final ref = LocalDocumentReference<Map<String, dynamic>>._(
        store: _store,
        path: entry.key,
      );
      final id = entry.key.split('/').last;
      return _InMemoryQueryDocumentSnapshot<T>(
        id: id,
        path: entry.key,
        reference: ref,
        value: _deepCloneMap(entry.value) as T,
      );
    }).toList();

    return _InMemoryQuerySnapshot<T>(docs);
  }

  Future<LocalQuerySnapshot<T>> get() async => _evaluate();

  Stream<LocalQuerySnapshot<T>> snapshots() {
    late StreamController<LocalQuerySnapshot<T>> controller;
    StreamSubscription<void>? sub;
    controller = StreamController<LocalQuerySnapshot<T>>(
      onListen: () {
        controller.add(_evaluate());
        sub = _store._changes.listen((_) {
          if (!controller.isClosed) {
            controller.add(_evaluate());
          }
        });
      },
      onCancel: () async {
        await sub?.cancel();
      },
    );
    return controller.stream;
  }
}

class LocalCollectionReference<T> extends LocalQuery<T> {
  final String _path;

  LocalCollectionReference._({
    required super.store,
    required String path,
  }) : _path = _normalizePath(path),
       super._(collectionPath: _normalizePath(path));

  String get id => _path.split('/').last;

  String get path => _path;

  LocalDocumentReference<Map<String, dynamic>>? get parent {
    final segments = _path.split('/');
    if (segments.length <= 1) return null;
    final parentPath = segments.sublist(0, segments.length - 1).join('/');
    return LocalDocumentReference<Map<String, dynamic>>._(
      store: _store,
      path: parentPath,
    );
  }

  LocalDocumentReference<T> doc([String? docId]) {
    final resolvedId = docId ?? _store._nextId();
    return LocalDocumentReference<T>._(
      store: _store,
      path: '$_path/$resolvedId',
    );
  }

  Future<LocalDocumentReference<T>> add(T data) async {
    final ref = doc();
    await ref.set(data);
    return ref;
  }
}

class LocalDocumentReference<T> {
  final LocalDataStore _store;
  final String path;

  LocalDocumentReference._({
    required LocalDataStore store,
    required String path,
  }) : _store = store,
       path = _normalizePath(path);

  String get id => path.split('/').last;

  LocalCollectionReference<Map<String, dynamic>> get parent {
    final segments = path.split('/');
    final parentPath = segments.sublist(0, segments.length - 1).join('/');
    return LocalCollectionReference<Map<String, dynamic>>._(
      store: _store,
      path: parentPath,
    );
  }

  LocalCollectionReference<Map<String, dynamic>> collection(String subPath) {
    return LocalCollectionReference<Map<String, dynamic>>._(
      store: _store,
      path: '$path/$subPath',
    );
  }

  Future<LocalDocumentSnapshot<T>> get() async {
    final data = _store._readDoc(path);
    return _InMemoryDocumentSnapshot<T>(
      id: id,
      path: path,
      reference: LocalDocumentReference<Map<String, dynamic>>._(
        store: _store,
        path: path,
      ),
      exists: data != null,
      value: data != null ? data as T : null,
    );
  }

  Future<void> set(T data, [LocalSetOptions? options]) async {
    _store._writeDoc(
      path,
      data as Map<String, dynamic>,
      merge: options?.merge ?? false,
    );
    _store._notify();
  }

  Future<void> update(Map<Object, Object?> data) async {
    final existing = _store._readDoc(path);
    if (existing == null) {
      throw LocalDataException(
        code: 'not-found',
        message: 'No document exists at $path',
      );
    }
    _store._writeDoc(
      path,
      data.map((key, value) => MapEntry(key.toString(), value)),
      merge: true,
    );
    _store._notify();
  }

  Future<void> delete() async {
    _store._deleteDoc(path);
    _store._notify();
  }

  Stream<LocalDocumentSnapshot<T>> snapshots() {
    late StreamController<LocalDocumentSnapshot<T>> controller;
    StreamSubscription<void>? sub;
    controller = StreamController<LocalDocumentSnapshot<T>>(
      onListen: () {
        final data = _store._readDoc(path);
        controller.add(
          _InMemoryDocumentSnapshot<T>(
            id: id,
            path: path,
            reference: LocalDocumentReference<Map<String, dynamic>>._(
              store: _store,
              path: path,
            ),
            exists: data != null,
            value: data != null ? data as T : null,
          ),
        );
        sub = _store._changes.listen((_) {
          if (!controller.isClosed) {
            final next = _store._readDoc(path);
            controller.add(
              _InMemoryDocumentSnapshot<T>(
                id: id,
                path: path,
                reference: LocalDocumentReference<Map<String, dynamic>>._(
                  store: _store,
                  path: path,
                ),
                exists: next != null,
                value: next != null ? next as T : null,
              ),
            );
          }
        });
      },
      onCancel: () async {
        await sub?.cancel();
      },
    );
    return controller.stream;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocalDocumentReference && path == other.path;

  @override
  int get hashCode => path.hashCode;
}

class LocalWriteBatch {
  final LocalDataStore _store;
  final List<void Function()> _ops = [];

  LocalWriteBatch._(this._store);

  void set<T>(
    LocalDocumentReference<T> document,
    T data, [
    LocalSetOptions? options,
  ]) {
    _ops.add(() {
      _store._writeDoc(
        document.path,
        data as Map<String, dynamic>,
        merge: options?.merge ?? false,
      );
    });
  }

  void update(LocalDocumentReference<dynamic> document, Map<Object, Object?> data) {
    _ops.add(() {
      final existing = _store._readDoc(document.path);
      if (existing == null) {
        throw LocalDataException(
          code: 'not-found',
          message: 'No document exists at ${document.path}',
        );
      }
      _store._writeDoc(
        document.path,
        data.map((key, value) => MapEntry(key.toString(), value)),
        merge: true,
      );
    });
  }

  void delete(LocalDocumentReference<dynamic> document) {
    _ops.add(() => _store._deleteDoc(document.path));
  }

  Future<void> commit() async {
    for (final op in _ops) {
      op();
    }
    _ops.clear();
    _store._notify();
  }
}

class LocalTransaction {
  final LocalDataStore _store;
  final List<void Function()> _ops = [];

  LocalTransaction._(this._store);

  Future<LocalDocumentSnapshot<T>> get<T>(LocalDocumentReference<T> document) {
    return document.get();
  }

  LocalTransaction set<T>(
    LocalDocumentReference<T> document,
    T data, [
    LocalSetOptions? options,
  ]) {
    _ops.add(() {
      _store._writeDoc(
        document.path,
        data as Map<String, dynamic>,
        merge: options?.merge ?? false,
      );
    });
    return this;
  }

  LocalTransaction update(
    LocalDocumentReference<dynamic> document,
    Map<Object, Object?> data,
  ) {
    _ops.add(() {
      final existing = _store._readDoc(document.path);
      if (existing == null) {
        throw LocalDataException(
          code: 'not-found',
          message: 'No document exists at ${document.path}',
        );
      }
      _store._writeDoc(
        document.path,
        data.map((key, value) => MapEntry(key.toString(), value)),
        merge: true,
      );
    });
    return this;
  }

  LocalTransaction delete(LocalDocumentReference<dynamic> document) {
    _ops.add(() => _store._deleteDoc(document.path));
    return this;
  }

  void _commit() {
    for (final op in _ops) {
      op();
    }
  }
}

class LocalDataStore {
  static final LocalDataStore instance = LocalDataStore();

  final Map<String, Map<String, dynamic>> _docs = {};
  final StreamController<void> _changeController =
      StreamController<void>.broadcast();
  int _idCounter = 1000;

  LocalDataStore({bool seedDemo = true}) {
    if (seedDemo) {
      _seedDemoWorkspace();
    }
  }

  Stream<void> get _changes => _changeController.stream;

  void _notify() {
    if (!_changeController.isClosed) {
      _changeController.add(null);
    }
  }

  String _nextId() {
    _idCounter += 1;
    return 'local_$_idCounter';
  }

  Map<String, dynamic>? _readDoc(String path) {
    final doc = _docs[_normalizePath(path)];
    return doc == null ? null : _deepCloneMap(doc);
  }

  void _writeDoc(
    String path,
    Map<String, dynamic> data, {
    bool merge = false,
  }) {
    final normalized = _normalizePath(path);
    final resolved = _resolveSentinels(data);
    if (merge && _docs.containsKey(normalized)) {
      final existing = _deepCloneMap(_docs[normalized]!);
      existing.addAll(resolved);
      _docs[normalized] = existing;
    } else {
      _docs[normalized] = resolved;
    }
  }

  void _deleteDoc(String path) {
    _docs.remove(_normalizePath(path));
  }

  List<MapEntry<String, Map<String, dynamic>>> _entriesForCollection(
    String collectionPath,
  ) {
    final norm = _normalizePath(collectionPath);
    final depth = norm.split('/').length + 1;
    final prefix = '$norm/';
    return _docs.entries
        .where((e) => e.key.startsWith(prefix) && e.key.split('/').length == depth)
        .map((e) => MapEntry(e.key, _deepCloneMap(e.value)))
        .toList();
  }

  List<MapEntry<String, Map<String, dynamic>>> _entriesForCollectionGroup(
    String collectionId,
  ) {
    return _docs.entries
        .where((e) {
          final segments = e.key.split('/');
          return segments.length >= 2 && segments[segments.length - 2] == collectionId;
        })
        .map((e) => MapEntry(e.key, _deepCloneMap(e.value)))
        .toList();
  }

  LocalCollectionReference<Map<String, dynamic>> collection(String path) {
    return LocalCollectionReference<Map<String, dynamic>>._(
      store: this,
      path: path,
    );
  }

  LocalQuery<Map<String, dynamic>> collectionGroup(String collectionId) {
    return LocalQuery<Map<String, dynamic>>._(
      store: this,
      collectionGroupId: collectionId,
    );
  }

  LocalDocumentReference<Map<String, dynamic>> doc(String path) {
    return LocalDocumentReference<Map<String, dynamic>>._(
      store: this,
      path: path,
    );
  }

  LocalWriteBatch batch() => LocalWriteBatch._(this);

  Future<T> runTransaction<T>(
    Future<T> Function(LocalTransaction transaction) transactionHandler,
  ) async {
    final tx = LocalTransaction._(this);
    final result = await transactionHandler(tx);
    tx._commit();
    _notify();
    return result;
  }

  void _seedDemoWorkspace() {
    final now = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));
    final weekAhead = now.add(const Duration(days: 7));

    _docs['users/demo-admin-1'] = {
      'email': OrganizationConfig.demoAdminEmail,
      'name': 'Alex Rivera',
      'role': 'admin',
      'isActive': true,
      'createdAt': LocalTimestamp(yesterday),
      'lastLogin': LocalTimestamp(now),
      'department': 'Administration',
    };

    _docs['users/demo-emp-1'] = {
      'email': OrganizationConfig.demoEmployeeEmail,
      'name': 'Maya Chen',
      'role': 'employee',
      'adminId': 'demo-admin-1',
      'isActive': true,
      'setupStatus': 'complete',
      'createdAt': LocalTimestamp(yesterday),
      'lastLogin': LocalTimestamp(now),
      'department': 'Clinical Services',
    };

    _docs['users/demo-emp-2'] = {
      'email': 'jordan@staffrail.local',
      'name': 'Jordan Patel',
      'role': 'employee',
      'adminId': 'demo-admin-1',
      'isActive': true,
      'setupStatus': 'complete',
      'createdAt': LocalTimestamp(yesterday),
      'lastLogin': LocalTimestamp(now),
      'department': 'Behavioral Support',
    };

    _docs['users/demo-emp-1/onboarding_tasks/onboarding_acknowledgment_form'] = {
      'title': 'Onboarding Acknowledgment form',
      'subtitle': 'Signature Required',
      'actionType': 'acknowledgeSign',
      'status': 'submitted',
      'isCompleted': false,
      'employeeId': 'demo-emp-1',
      'employeeName': 'Maya Chen',
      'adminId': 'demo-admin-1',
      'signatureUrl': 'typed:Maya Chen',
      'formData': {'fullName': 'Maya Chen'},
      'updatedAt': LocalTimestamp(now),
      'dueDate': LocalTimestamp(weekAhead),
    };

    _docs['users/demo-emp-1/onboarding_tasks/resume'] = {
      'title': 'Resume',
      'subtitle': 'Upload Required',
      'actionType': 'upload',
      'status': 'notStarted',
      'isCompleted': false,
      'employeeId': 'demo-emp-1',
      'employeeName': 'Maya Chen',
      'adminId': 'demo-admin-1',
      'updatedAt': LocalTimestamp(yesterday),
      'dueDate': LocalTimestamp(weekAhead),
    };

    _docs['users/demo-emp-1/trainings/hipaa'] = {
      'title': 'HIPAA',
      'description': 'Mandatory Training Module.',
      'durationText': '2 hours',
      'status': 'notStarted',
      'noExpiration': false,
      'employeeId': 'demo-emp-1',
      'adminId': 'demo-admin-1',
      'assignedAt': LocalTimestamp(yesterday),
      'dueDate': LocalTimestamp(weekAhead),
      'updatedAt': LocalTimestamp(yesterday),
    };

    _docs['users/demo-emp-1/clearance/tb_status_report'] = {
      'title': 'TB Status Report',
      'description': 'Official TB test results verification.',
      'status': 'underReview',
      'fileUrl': '/demo/tb-status-report.pdf',
      'employeeId': 'demo-emp-1',
      'employeeName': 'Maya Chen',
      'adminId': 'demo-admin-1',
      'submittedAt': LocalTimestamp(yesterday),
      'updatedAt': LocalTimestamp(now),
      'dueDate': LocalTimestamp(weekAhead),
    };

    _docs['messages/demo-msg-1'] = {
      'title': 'Welcome to ${OrganizationConfig.appName}',
      'content':
          'Please complete your assigned onboarding tasks and compliance trainings in local demo mode.',
      'authorId': 'demo-admin-1',
      'authorName': 'Alex Rivera',
      'recipientId': 'broadcast',
      'timestamp': LocalTimestamp(now),
      'isPushEnabled': true,
    };

    _docs['training_templates/template-hipaa'] = {
      'title': 'HIPAA Privacy & Security',
      'description': 'Annual privacy compliance training.',
      'durationText': '2 hours',
      'requirementType': 'certificate',
      'isActive': true,
      'createdAt': LocalTimestamp(yesterday),
      'updatedAt': LocalTimestamp(now),
    };
  }
}

// ── Local Auth ───────────────────────────────────────────────────────────────

class LocalAuthCredential {
  final String email;
  final String password;

  const LocalAuthCredential._({required this.email, required this.password});
}

class LocalEmailAuthProvider {
  LocalEmailAuthProvider._();

  static LocalAuthCredential credential({
    required String email,
    required String password,
  }) => LocalAuthCredential._(email: email, password: password);
}

class _LocalAuthAccount {
  final String uid;
  final String email;
  String password;
  String? displayName;
  String? photoURL;
  bool emailVerified;

  _LocalAuthAccount({
    required this.uid,
    required this.email,
    required this.password,
    this.displayName,
    this.emailVerified = true,
  });
}

class LocalUser {
  final LocalAuth _auth;
  final _LocalAuthAccount _account;

  LocalUser._(this._auth, this._account);

  String get uid => _account.uid;
  String? get email => _account.email;
  String? get displayName => _account.displayName;
  String? get photoURL => _account.photoURL;
  bool get emailVerified => _account.emailVerified;

  Future<void> reload() async {}

  Future<void> sendEmailVerification() async {
    _account.emailVerified = true;
    _auth._emit();
  }

  Future<void> updatePassword(String newPassword) async {
    if (newPassword.length < 6) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'weak-password',
        message: 'Password must be at least 6 characters.',
      );
    }
    _account.password = newPassword;
  }

  Future<LocalUserCredential> reauthenticateWithCredential(
    LocalAuthCredential credential,
  ) async {
    if (_account.email.toLowerCase() != credential.email.trim().toLowerCase() ||
        _account.password != credential.password) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'wrong-password',
        message: 'Incorrect password.',
      );
    }
    return LocalUserCredential._(user: this);
  }

  Future<String?> getIdToken([bool forceRefresh = false]) async =>
      'local-token-$uid';
}

class LocalUserCredential {
  final LocalUser? user;

  const LocalUserCredential._({this.user});
}

class LocalAuth {
  static final LocalAuth instance = LocalAuth();

  final Map<String, _LocalAuthAccount> _accountsByEmail = {
    OrganizationConfig.demoAdminEmail: _LocalAuthAccount(
      uid: 'demo-admin-1',
      email: OrganizationConfig.demoAdminEmail,
      password: OrganizationConfig.demoPassword,
      displayName: 'Alex Rivera',
      emailVerified: true,
    ),
    OrganizationConfig.demoEmployeeEmail: _LocalAuthAccount(
      uid: 'demo-emp-1',
      email: OrganizationConfig.demoEmployeeEmail,
      password: OrganizationConfig.demoPassword,
      displayName: 'Maya Chen',
      emailVerified: true,
    ),
    'jordan@staffrail.local': _LocalAuthAccount(
      uid: 'demo-emp-2',
      email: 'jordan@staffrail.local',
      password: OrganizationConfig.demoPassword,
      displayName: 'Jordan Patel',
      emailVerified: true,
    ),
  };

  LocalUser? _currentUser;
  final StreamController<LocalUser?> _authStateController =
      StreamController<LocalUser?>.broadcast();
  int _uidCounter = 100;

  LocalUser? get currentUser => _currentUser;

  void _emit() {
    if (!_authStateController.isClosed) {
      _authStateController.add(_currentUser);
    }
  }

  Stream<LocalUser?> authStateChanges() {
    late StreamController<LocalUser?> controller;
    StreamSubscription<LocalUser?>? sub;
    controller = StreamController<LocalUser?>(
      onListen: () {
        controller.add(_currentUser);
        sub = _authStateController.stream.listen((user) {
          if (!controller.isClosed) {
            controller.add(user);
          }
        });
      },
      onCancel: () async {
        await sub?.cancel();
      },
    );
    return controller.stream;
  }

  Future<LocalUserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    final normalized = email.trim().toLowerCase();
    final account = _accountsByEmail[normalized];
    if (account == null) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'user-not-found',
        message: 'No account found with this email address.',
      );
    }
    if (account.password != password) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'wrong-password',
        message: 'Incorrect email or password.',
      );
    }
    final user = LocalUser._(this, account);
    _currentUser = user;
    _emit();
    return LocalUserCredential._(user: user);
  }

  Future<LocalUserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    final normalized = email.trim().toLowerCase();
    if (_accountsByEmail.containsKey(normalized)) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'email-already-in-use',
        message: 'An account with this email already exists.',
      );
    }
    if (password.length < 6) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'weak-password',
        message: 'Password must be at least 6 characters.',
      );
    }
    _uidCounter += 1;
    final account = _LocalAuthAccount(
      uid: 'local-user-$_uidCounter',
      email: normalized,
      password: password,
      emailVerified: true,
    );
    _accountsByEmail[normalized] = account;
    final user = LocalUser._(this, account);
    _currentUser = user;
    _emit();
    return LocalUserCredential._(user: user);
  }

  Future<void> sendPasswordResetEmail({required String email}) async {
    final normalized = email.trim().toLowerCase();
    if (!_accountsByEmail.containsKey(normalized)) {
      throw LocalDataException(
        plugin: 'local_auth',
        code: 'user-not-found',
        message: 'No account found with this email address.',
      );
    }
  }

  Future<void> signOut() async {
    _currentUser = null;
    _emit();
  }

  _LocalAuthAccount _registerProvisionedAccount({
    required String email,
    required String name,
  }) {
    final normalized = email.trim().toLowerCase();
    if (_accountsByEmail.containsKey(normalized)) {
      throw LocalDataException(
        plugin: 'local_actions',
        code: 'already-exists',
        message: 'An account with this email already exists.',
      );
    }
    _uidCounter += 1;
    final account = _LocalAuthAccount(
      uid: 'staff-$_uidCounter',
      email: normalized,
      password: OrganizationConfig.demoPassword,
      displayName: name,
      emailVerified: true,
    );
    _accountsByEmail[normalized] = account;
    return account;
  }
}

// ── Local Storage ────────────────────────────────────────────────────────────

class LocalSettableMetadata {
  final String? contentType;
  final Map<String, String>? customMetadata;

  LocalSettableMetadata({this.contentType, this.customMetadata});
}

class LocalTaskSnapshot {
  final int bytesTransferred;
  final int totalBytes;
  final LocalStorageReference ref;

  LocalTaskSnapshot({
    required this.bytesTransferred,
    required this.totalBytes,
    required this.ref,
  });
}

class LocalUploadTask implements Future<LocalTaskSnapshot> {
  final LocalTaskSnapshot _snapshot;
  final Stream<LocalTaskSnapshot> snapshotEvents;

  LocalUploadTask._(this._snapshot)
    : snapshotEvents = Stream.value(_snapshot);

  @override
  Stream<LocalTaskSnapshot> asStream() => Future.value(_snapshot).asStream();

  @override
  Future<LocalTaskSnapshot> catchError(
    Function onError, {
    bool Function(Object error)? test,
  }) => Future.value(_snapshot).catchError(onError, test: test);

  @override
  Future<R> then<R>(
    FutureOr<R> Function(LocalTaskSnapshot value) onValue, {
    Function? onError,
  }) => Future.value(_snapshot).then(onValue, onError: onError);

  @override
  Future<LocalTaskSnapshot> timeout(
    Duration timeLimit, {
    FutureOr<LocalTaskSnapshot> Function()? onTimeout,
  }) => Future.value(_snapshot).timeout(timeLimit, onTimeout: onTimeout);

  @override
  Future<LocalTaskSnapshot> whenComplete(FutureOr<void> Function() action) =>
      Future.value(_snapshot).whenComplete(action);
}

class LocalStorageReference {
  final LocalStorage _storage;
  final String fullPath;

  LocalStorageReference._(this._storage, this.fullPath);

  LocalStorageReference child(String path) {
    final prefix = fullPath.isEmpty ? '' : '$fullPath/';
    return LocalStorageReference._(_storage, _normalizePath('$prefix$path'));
  }

  LocalUploadTask putData(Uint8List data, [LocalSettableMetadata? metadata]) {
    _storage._files[fullPath] = _StoredBlob(
      bytes: Uint8List.fromList(data),
      contentType: metadata?.contentType ?? 'application/octet-stream',
    );
    final snap = LocalTaskSnapshot(
      bytesTransferred: data.length,
      totalBytes: data.length,
      ref: this,
    );
    return LocalUploadTask._(snap);
  }

  Future<String> getDownloadURL() async {
    final blob = _storage._files[fullPath];
    if (blob == null) {
      throw LocalDataException(
        plugin: 'local_storage',
        code: 'object-not-found',
        message: 'Object not found at $fullPath',
      );
    }
    final b64 = base64Encode(blob.bytes);
    return 'data:${blob.contentType};base64,$b64';
  }

  Future<void> delete() async {
    _storage._files.remove(fullPath);
  }
}

class _StoredBlob {
  final Uint8List bytes;
  final String contentType;

  _StoredBlob({required this.bytes, required this.contentType});
}

class LocalStorage {
  static final LocalStorage instance = LocalStorage();

  final Map<String, _StoredBlob> _files = {};

  LocalStorageReference ref([String path = '']) =>
      LocalStorageReference._(this, _normalizePath(path));
}

// ── Local Actions (replaces Cloud Functions) ─────────────────────────────────

class LocalHttpsCallableOptions {
  final Duration timeout;

  const LocalHttpsCallableOptions({this.timeout = const Duration(seconds: 30)});
}

class LocalHttpsCallableResult<T> {
  final T data;

  const LocalHttpsCallableResult(this.data);
}

class LocalHttpsCallable {
  final LocalFunctions _functions;
  final String name;

  LocalHttpsCallable._(this._functions, this.name);

  Future<LocalHttpsCallableResult<dynamic>> call([dynamic parameters]) {
    return _functions._invoke(name, parameters);
  }
}

class LocalFunctions {
  static final LocalFunctions instance = LocalFunctions();

  LocalHttpsCallable httpsCallable(
    String name, {
    LocalHttpsCallableOptions? options,
  }) => LocalHttpsCallable._(this, name);

  Future<LocalHttpsCallableResult<dynamic>> _invoke(
    String name,
    dynamic parameters,
  ) async {
    final store = LocalDataStore.instance;
    final auth = LocalAuth.instance;

    if (name == 'registerStaff') {
      final map = Map<String, dynamic>.from(parameters as Map? ?? const {});
      final email = (map['email'] as String? ?? '').trim().toLowerCase();
      final staffName = (map['name'] as String? ?? '').trim();
      final role = (map['role'] as String? ?? 'employee').trim();
      final adminUid = auth.currentUser?.uid ?? 'demo-admin-1';

      if (email.isEmpty || staffName.isEmpty) {
        throw LocalDataException(
          plugin: 'local_actions',
          code: 'invalid-argument',
          message: 'Name and email are required.',
        );
      }

      final account = auth._registerProvisionedAccount(
        email: email,
        name: staffName,
      );
      await store.collection('users').doc(account.uid).set({
        'email': email,
        'name': staffName,
        'role': role,
        'adminId': adminUid,
        'isActive': true,
        'setupStatus': 'incomplete',
        'createdAt': LocalTimestamp.now(),
        'lastLogin': LocalTimestamp.now(),
      });
      return LocalHttpsCallableResult({
        'success': true,
        'uid': account.uid,
        'resetLink': '/forgot-password?token=local-demo-${account.uid}',
      });
    }

    if (name == 'deleteAdminWorkspace') {
      final current = auth.currentUser;
      if (current == null) {
        throw LocalDataException(
          plugin: 'local_actions',
          code: 'unauthenticated',
          message: 'Sign in required.',
        );
      }
      final adminDoc = await store.collection('users').doc(current.uid).get();
      final adminData = adminDoc.data();
      if (adminData == null ||
          adminData['role'] != 'admin' ||
          adminData['isActive'] == false) {
        throw LocalDataException(
          plugin: 'local_actions',
          code: 'permission-denied',
          message: 'Only an active admin can dissolve this workspace.',
        );
      }
      final employees = await store
          .collection('users')
          .where('adminId', isEqualTo: current.uid)
          .get();
      final batch = store.batch();
      batch.update(store.collection('users').doc(current.uid), {
        'isActive': false,
        'deletedAt': LocalFieldValue.serverTimestamp(),
      });
      for (final emp in employees.docs) {
        batch.update(emp.reference, {
          'isActive': false,
          'deletedAt': LocalFieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      return const LocalHttpsCallableResult({'success': true});
    }

    throw LocalDataException(
      plugin: 'local_actions',
      code: 'unimplemented',
      message: 'Unknown local action: $name',
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

String _normalizePath(String path) =>
    path.split('/').where((segment) => segment.isNotEmpty).join('/');

Map<String, dynamic> _resolveSentinels(Map<String, dynamic> input) {
  final out = <String, dynamic>{};
  for (final entry in input.entries) {
    final value = entry.value;
    if (value is _ServerTimestampSentinel) {
      out[entry.key] = LocalTimestamp.now();
    } else if (value is DateTime) {
      out[entry.key] = LocalTimestamp(value);
    } else if (value is Map<String, dynamic>) {
      out[entry.key] = _resolveSentinels(value);
    } else if (value is List) {
      out[entry.key] = _cloneList(value);
    } else {
      out[entry.key] = value;
    }
  }
  return out;
}

Map<String, dynamic> _deepCloneMap(Map<String, dynamic> input) {
  final out = <String, dynamic>{};
  for (final entry in input.entries) {
    final v = entry.value;
    if (v is Map<String, dynamic>) {
      out[entry.key] = _deepCloneMap(v);
    } else if (v is List) {
      out[entry.key] = _cloneList(v);
    } else {
      out[entry.key] = v;
    }
  }
  return out;
}

List<dynamic> _cloneList(List<dynamic> list) {
  return list.map((item) {
    if (item is Map<String, dynamic>) return _deepCloneMap(item);
    if (item is List) return _cloneList(item);
    return item;
  }).toList();
}
