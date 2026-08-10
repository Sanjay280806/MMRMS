import { Component } from 'react';
import { EmptyState } from './EmptyState.jsx';

/**
 * Keeps one failing section from blanking the whole console. Resets when
 * `resetKey` changes, so navigating away from a broken section recovers.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('Section failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState
          icon="!"
          title="This section couldn't be displayed"
          description={this.state.error.message}
        />
      );
    }
    return this.props.children;
  }
}
