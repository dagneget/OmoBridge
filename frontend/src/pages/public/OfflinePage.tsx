import React from 'react';
import { WifiOff, RotateCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';

export const OfflinePage: React.FC = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">You are currently offline</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          It looks like you lost your internet connection. You can still view pages you previously visited, or retry connecting once your network returns.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={handleReload}
            leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}
          >
            Retry Connection
          </Button>
          <Link to="/">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              leftIcon={<Home className="w-4 h-4" aria-hidden="true" />}
            >
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
