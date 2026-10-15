import React, { useState, useEffect } from 'react';
import { MainLayout } from './layout/MainLayout';
import { AppStartupShimmer } from './components/Shimmer/AppStartupShimmer';
import { sequentialFeatureLoader } from './services/sequentialFeatureLoader';

export const App: React.FC = () => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Initializing Binary IDE...');

  useEffect(() => {
    let isMounted = true;

    sequentialFeatureLoader.startBootstrap((newStatus) => {
      if (isMounted) setStatus(newStatus);
    }).then(() => {
      if (isMounted) setIsReady(true);
    }).catch((err) => {
      console.error('[Bootstrap] Initialization error:', err);
      if (isMounted) setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return <AppStartupShimmer statusMessage={status} />;
  }

  return (
    <div className="app-fade-in" style={{ width: '100%', height: '100%' }}>
      <MainLayout />
    </div>
  );
};

export default App;
