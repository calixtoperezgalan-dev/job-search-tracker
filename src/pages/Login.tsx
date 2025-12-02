import { Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Search Tracker</h1>
              <p className="text-sm text-gray-500">Executive Search Dashboard</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-gray-600">Track your executive job search with AI-powered insights</p>
            </div>
            <Button onClick={signInWithGoogle} className="w-full" size="lg">
              Sign in with Google
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Requires Gmail and Drive access for full functionality
            </p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">Target: $800K+ roles by Feb 1, 2026</p>
        </div>
      </div>
    </div>
  );
}
