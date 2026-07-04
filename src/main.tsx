import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    const self = this as any;
    if (self.state.hasError) {
      return <div style={{background:'red',color:'white',padding:'20px',zIndex:9999,position:'absolute',inset:0}}>{self.state.error?.toString()}<br/>{self.state.error?.stack}</div>;
    }
    return self.props.children;
  }
}

import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
