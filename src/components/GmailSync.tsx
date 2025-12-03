import { useState, useEffect } from 'react';
import { Button, Card } from './ui';
import { Mail, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { syncGmail } from '../lib/api';

interface SyncState {
  last_sync_at: string | null;
  sync_enabled: boolean;
}

export default function GmailSync() {
  const { user, session } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSyncState();
  }, [user]);

  const loadSyncState = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('gmail_sync_state')
      .select('last_sync_at, sync_enabled')
      .eq('user_id', user.id)
      .single();

    setSyncState(data);
  };

  const initializeSync = async () => {
    if (!user || !session?.provider_token) {
      setError('Please sign in with Google to enable Gmail sync');
      return;
    }

    try {
      // Store tokens in gmail_sync_state
      const { error: upsertError } = await supabase
        .from('gmail_sync_state')
        .upsert({
          user_id: user.id,
          access_token_encrypted: session.provider_token,
          refresh_token_encrypted: session.provider_refresh_token || '',
          token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          sync_enabled: true,
          last_sync_at: null,
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      await loadSyncState();
      setError(null);
    } catch (err: any) {
      console.error('Error initializing sync:', err);
      setError(err.message);
    }
  };

  const handleSync = async () => {
    if (!syncState) {
      await initializeSync();
    }

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncGmail();
      setSyncResult(result);
      await loadSyncState();
    } catch (err: any) {
      console.error('Error syncing Gmail:', err);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const toggleSync = async () => {
    if (!user) return;

    const newState = !syncState?.sync_enabled;

    await supabase
      .from('gmail_sync_state')
      .update({ sync_enabled: newState })
      .eq('user_id', user.id);

    await loadSyncState();
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Gmail Sync
        </h3>
        {syncState && (
          <label htmlFor="gmail-sync-enabled" className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="gmail-sync-enabled"
              name="gmail_sync_enabled"
              checked={syncState.sync_enabled}
              onChange={toggleSync}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-600">Enabled</span>
          </label>
        )}
      </div>

      <div className="space-y-4">
        {!syncState ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 mb-3">
              Connect your Gmail account to automatically sync job application status updates from email labels.
            </p>
            <Button onClick={initializeSync} size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Last Sync</p>
                <p className="text-xs text-gray-600">
                  {syncState.last_sync_at
                    ? new Date(syncState.last_sync_at).toLocaleString()
                    : 'Never synced'}
                </p>
              </div>
              <Button
                onClick={handleSync}
                disabled={syncing || !syncState.sync_enabled}
                size="sm"
              >
                {syncing ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Sync Error</p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {syncResult && (
              <div className={`p-3 border rounded-lg flex items-start gap-2 ${
                syncResult.success === false ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
              }`}>
                <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  syncResult.success === false ? 'text-yellow-600' : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    syncResult.success === false ? 'text-yellow-900' : 'text-green-900'
                  }`}>
                    {syncResult.success === false ? 'Label Configuration Issue' : 'Sync Successful'}
                  </p>
                  <div className={`text-xs mt-2 space-y-1 ${
                    syncResult.success === false ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    <>
                      {syncResult.success === false && syncResult.debug?.expectedLabels ? (
                        <>
                          <p className="font-medium">No Gmail labels found matching expected names.</p>
                          <p className="mt-2">Expected labels:</p>
                          <p className="font-mono text-xs">{syncResult.debug.expectedLabels.join(', ')}</p>
                          <p className="mt-2">Your Gmail labels (first 10):</p>
                          <p className="font-mono text-xs">{syncResult.debug.availableLabels?.slice(0, 10).join(', ')}</p>
                        </>
                      ) : (
                        <>
                          <p>• Processed: {syncResult.processed} emails</p>
                          <p>• Matched: {syncResult.matched} applications updated</p>
                          <p>• Unmatched: {syncResult.unmatched} emails</p>
                          {syncResult.networkingContacts > 0 && (
                            <p>• Networking: {syncResult.networkingContacts} contacts</p>
                          )}
                        </>
                      )}
                      {syncResult.debug && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="font-medium">Debug Info:</p>
                          <p>• Found labels: {syncResult.debug.foundLabels?.join(', ') || 'none'}</p>
                          <p>• Messages found: {syncResult.debug.messagesFound ?? 0}</p>
                        </div>
                      )}
                    </>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Gmail Labels Monitored:</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                JH25 - Applied • JH25 - Follow up • JH25 - Hiring Manager • JH25 - interviews •
                JH25 - Offer • JH25 - Recruiter Screen • JH25 - Withdraw • JH25-Rejected
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
