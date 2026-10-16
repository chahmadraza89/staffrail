// Unit tests for DataState sealed class

import 'package:bhmh/core/shared/app_stated.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DataInitialState', () {
    test('should create instance', () {
      const state = DataInitialState<String>();

      expect(state, isA<DataState<String>>());
    });

    test('should be equal to other DataInitialState', () {
      const state1 = DataInitialState<int>();
      const state2 = DataInitialState<int>();

      expect(state1, state2);
    });
  });

  group('DataLoadingState', () {
    test('should create instance', () {
      const state = DataLoadingState<String>();

      expect(state, isA<DataState<String>>());
    });

    test('should be equal to other DataLoadingState', () {
      const state1 = DataLoadingState<String>();
      const state2 = DataLoadingState<String>();

      expect(state1, state2);
    });
  });

  group('DataLoadedState', () {
    test('should create instance with data', () {
      const state = DataLoadedState(data: 'Hello');

      expect(state.data, 'Hello');
    });

    test('should hold complex data types', () {
      final state = DataLoadedState(data: {'key': 'value', 'count': 42});

      expect(state.data['key'], 'value');
      expect(state.data['count'], 42);
    });

    test('should hold list data', () {
      final state = DataLoadedState(data: [1, 2, 3]);

      expect(state.data, [1, 2, 3]);
    });

    test('Equatable should compare data by value for primitives', () {
      const state1 = DataLoadedState(data: 'Hello');
      const state2 = DataLoadedState(data: 'Hello');

      expect(state1, state2);
    });

    test('Equatable should consider different data as not equal', () {
      const state1 = DataLoadedState(data: 'Hello');
      const state2 = DataLoadedState(data: 'World');

      expect(state1 == state2, isFalse);
    });
  });

  group('DataErrorState', () {
    test('should create instance with message', () {
      const state = DataErrorState(message: 'Something went wrong');

      expect(state.message, 'Something went wrong');
    });

    test('Equatable should consider equal errors as equal', () {
      const state1 = DataErrorState(message: 'Error');
      const state2 = DataErrorState(message: 'Error');

      expect(state1, state2);
    });

    test('Equatable should consider different errors as not equal', () {
      const state1 = DataErrorState(message: 'Error 1');
      const state2 = DataErrorState(message: 'Error 2');

      expect(state1 == state2, isFalse);
    });
  });

  group('Exhaustive switch on DataState', () {
    test('should handle all DataState subtypes', () {
      final states = <DataState<String>>[
        const DataInitialState(),
        const DataLoadingState(),
        const DataLoadedState(data: 'data'),
        const DataErrorState(message: 'error'),
      ];

      for (final state in states) {
        String result;
        switch (state) {
          case DataInitialState():
            result = 'initial';
          case DataLoadingState():
            result = 'loading';
          case DataLoadedState():
            result = 'loaded:${state.data}';
          case DataErrorState():
            result = 'error:${state.message}';
        }
        expect(result, isNotNull);
      }
    });
  });

  group('DataState type safety', () {
    test('should support generic int type', () {
      const state = DataLoadedState(data: 42);
      expect(state.data, 42);
    });

    test('should support generic bool type', () {
      const state = DataLoadedState(data: true);
      expect(state.data, true);
    });

    test('should support nullable generic type', () {
      const state = DataLoadedState<String?>(data: null);
      expect(state.data, isNull);
    });

    test('should support bool type', () {
      const state = DataLoadedState(data: true);
      expect(state.data, true);
    });
  });
}
