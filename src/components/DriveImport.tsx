import { useState, useEffect } from 'react';
import { Button, Modal, Card } from './ui';
import { Upload, CheckCircle, XCircle, FileText, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { listDriveFiles, downloadDriveFile, parseJobDescription, scoreFit, type DriveFile } from '../lib/api';

const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '15Tr9_d19ryo0unmno6dKxEDy5fEVuQ6p';

interface ImportProgress {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  currentFile?: string;
}

interface FileSelection {
  file: DriveFile;
  selected: boolean;
  status?: 'pending' | 'importing' | 'success' | 'skipped' | 'error';
  error?: string;
}

export default function DriveImport({ onComplete }: { onComplete?: () => void }) {
  const { user, session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'select' | 'import' | 'complete'>('select');
  const [files, setFiles] = useState<FileSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({ total: 0, imported: 0, skipped: 0, errors: 0 });

  const loadFiles = async () => {
    if (!session?.provider_token) {
      alert('Please reconnect your Google account in Settings');
      return;
    }

    setLoading(true);
    try {
      const driveFiles = await listDriveFiles(session.provider_token, FOLDER_ID);

      // Check which files already exist
      const { data: existingApps } = await supabase
        .from('applications')
        .select('google_drive_file_id')
        .eq('user_id', user?.id);

      const existingIds = new Set(existingApps?.map(a => a.google_drive_file_id) || []);

      setFiles(
        driveFiles.map(file => ({
          file,
          selected: !existingIds.has(file.id),
          status: existingIds.has(file.id) ? 'skipped' : 'pending',
        }))
      );
    } catch (error: any) {
      console.error('Error loading files:', error);
      alert('Failed to load files from Google Drive. Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (selected: boolean) => {
    setFiles(files.map(f => ({ ...f, selected: f.status !== 'skipped' ? selected : false })));
  };

  const selectedCount = files.filter(f => f.selected).length;

  const startImport = async () => {
    if (!session?.provider_token) {
      alert('Please reconnect your Google account');
      return;
    }

    setImporting(true);
    setStep('import');

    const selectedFiles = files.filter(f => f.selected);
    setProgress({
      total: selectedFiles.length,
      imported: 0,
      skipped: 0,
      errors: 0,
    });

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileSelection = selectedFiles[i];
      const file = fileSelection.file;

      setProgress(prev => ({ ...prev, currentFile: file.name }));

      // Update UI to show importing
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.file.id === file.id ? { ...f, status: 'importing' } : f
        )
      );

      try {
        // Download file content
        const downloadResult = await downloadDriveFile(session.provider_token!, file.id, file.mimeType);

        // Check if it's a .docx file
        const isDocx = file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // Parse with Claude (using web search for enrichment)
        const parsed = await parseJobDescription(downloadResult.content, file.id, file.name, isDocx);

        // Save to database
        const { data: application, error: insertError } = await supabase
          .from('applications')
          .insert({
            user_id: user?.id,
            company_name: parsed.company_name,
            company_summary: parsed.company_summary,
            job_title: parsed.job_title,
            salary_min: parsed.salary_min,
            salary_max: parsed.salary_max,
            salary_currency: 'USD',
            location: parsed.location,
            company_size: parsed.company_size,
            annual_revenue: parsed.annual_revenue,
            industry: parsed.industry,
            company_type: parsed.company_type,
            stock_ticker: parsed.stock_ticker,
            application_date: new Date().toISOString().split('T')[0],
            status: 'applied',
            google_drive_file_id: file.id,
            google_drive_file_url: file.webViewLink,
            job_description_text: parsed.job_description_text,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Score fit (async, don't wait)
        if (application) {
          scoreFit(application.id, parsed.job_description_text).catch(err =>
            console.error('Failed to score fit:', err)
          );
        }

        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.file.id === file.id ? { ...f, status: 'success' } : f
          )
        );

        setProgress(prev => ({ ...prev, imported: prev.imported + 1 }));
      } catch (error: any) {
        console.error(`Error importing ${file.name}:`, error);

        setFiles(prevFiles =>
          prevFiles.map(f =>
            f.file.id === file.id
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );

        setProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
      }
    }

    setImporting(false);
    setStep('complete');

    if (onComplete) {
      onComplete();
    }
  };

  const handleOpen = () => {
    setShowModal(true);
    setStep('select');
    setFiles([]);
    setProgress({ total: 0, imported: 0, skipped: 0, errors: 0 });
    loadFiles();
  };

  const handleClose = () => {
    if (!importing) {
      setShowModal(false);
    }
  };

  return (
    <>
      <Button onClick={handleOpen}>
        <Upload className="w-4 h-4 mr-2" />
        Import from Google Drive
      </Button>

      <Modal isOpen={showModal} onClose={handleClose} title="Import from Google Drive" size="xl">
        {step === 'select' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading files from Google Drive...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-2">No files found in your Google Drive folder</p>
                <p className="text-sm text-gray-500">Folder ID: {FOLDER_ID}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">{files.length}</span> files found
                    {' • '}
                    <span className="font-medium text-blue-600">{selectedCount}</span> selected
                    {' • '}
                    <span className="text-gray-500">{files.filter(f => f.status === 'skipped').length}</span> already imported
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => toggleAll(true)}>
                      Select All
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => toggleAll(false)}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {files.map((fileSelection) => (
                    <div
                      key={fileSelection.file.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        fileSelection.selected
                          ? 'bg-blue-50 border-blue-200'
                          : fileSelection.status === 'skipped'
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={fileSelection.selected}
                          disabled={fileSelection.status === 'skipped'}
                          onChange={(e) => {
                            setFiles(files.map(f =>
                              f.file.id === fileSelection.file.id
                                ? { ...f, selected: e.target.checked }
                                : f
                            ));
                          }}
                          className="w-4 h-4"
                        />
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileSelection.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(fileSelection.file.modifiedTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {fileSelection.status === 'skipped' && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Already imported
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={startImport} disabled={selectedCount === 0}>
                    Import {selectedCount} {selectedCount === 1 ? 'File' : 'Files'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'import' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Applications</h3>
              <p className="text-gray-600 mb-6">
                {progress.currentFile || 'Processing...'}
              </p>

              <div className="bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: `${(progress.imported + progress.errors) / progress.total * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card className="text-center p-3">
                  <p className="text-2xl font-bold text-green-600">{progress.imported}</p>
                  <p className="text-xs text-gray-600">Imported</p>
                </Card>
                <Card className="text-center p-3">
                  <p className="text-2xl font-bold text-red-600">{progress.errors}</p>
                  <p className="text-xs text-gray-600">Errors</p>
                </Card>
                <Card className="text-center p-3">
                  <p className="text-2xl font-bold text-gray-600">{progress.total}</p>
                  <p className="text-xs text-gray-600">Total</p>
                </Card>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600 mb-6">
                Successfully imported {progress.imported} of {progress.total} applications
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                <Card className="text-center p-4">
                  <p className="text-3xl font-bold text-green-600">{progress.imported}</p>
                  <p className="text-sm text-gray-600">Imported</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-3xl font-bold text-red-600">{progress.errors}</p>
                  <p className="text-sm text-gray-600">Errors</p>
                </Card>
              </div>

              {progress.errors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-h-48 overflow-y-auto">
                  <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
                  <div className="space-y-2">
                    {files
                      .filter(f => f.status === 'error')
                      .map(f => (
                        <div key={f.file.id} className="text-sm">
                          <p className="font-medium text-red-800">{f.file.name}</p>
                          <p className="text-red-600">{f.error}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button onClick={() => setShowModal(false)}>Close</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                View Applications
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
