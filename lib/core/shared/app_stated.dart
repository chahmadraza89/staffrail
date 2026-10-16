import 'package:equatable/equatable.dart';

// 1. Extend Equatable to enable Value Comparison
sealed class DataState<T> extends Equatable {
  const DataState();

  @override
  List<Object?> get props => [];
}

class DataInitialState<T> extends DataState<T> {
  const DataInitialState();
}

class DataLoadingState<T> extends DataState<T> {
  const DataLoadingState();
}

class DataLoadedState<T> extends DataState<T> {
  final T data;

  const DataLoadedState({required this.data});

  // Now, if data is the same, the State is considered the same
  @override
  List<Object?> get props => [data];
}

class DataErrorState<T> extends DataState<T> {
  final String message;

  const DataErrorState({required this.message});

  @override
  List<Object?> get props => [message];
}
