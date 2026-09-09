import { Component, type ReactNode } from 'react';
import { Workspace } from './components/Workspace';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="error-screen">
        <h1>Math Elements</h1>
        <p>表示を復元できませんでした。保存した作業は保持されています。</p>
        <button onClick={() => location.reload()}>再読み込み</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <Workspace />
    </ErrorBoundary>
  );
}
