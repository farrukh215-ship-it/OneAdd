import type { ReactNode } from 'react';
import { Component } from 'react';
import { Pressable, Text, View } from 'react-native';

type State = {
  hasError: boolean;
  message?: string;
};

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Unknown startup error',
    };
  }

  componentDidCatch(error: Error) {
    console.error('RootErrorBoundary', error);
  }

  private reset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-xl font-extrabold text-red">App Startup Error</Text>
        <Text className="mt-3 text-center text-sm text-ink2">{this.state.message ?? 'Unexpected error'}</Text>
        <Pressable onPress={this.reset} className="mt-6 rounded-xl bg-red px-5 py-3">
          <Text className="font-bold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }
}
