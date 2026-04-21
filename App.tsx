
import React, { useContext } from 'react';
import { AuthProvider } from './components/auth/AuthProvider';
import { AppContext } from './contexts/AppContext';
import LoginPage from './components/auth/LoginPage';
import MainApplication from './components/MainApplication';

const AppContent: React.FC = () => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error("AppContext not found");
    }

    const { session } = context;
    return session ? <MainApplication /> : <LoginPage />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
        <AppContent />
    </AuthProvider>
  );
};

export default App;
