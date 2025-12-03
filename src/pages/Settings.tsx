import Layout from '../components/layout/Layout';
import { Card, Button, Input } from '../components/ui';
import { User, Mail, Database, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GmailSync from '../components/GmailSync';

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <Layout title="Settings" subtitle="Manage your profile and preferences">
      <div className="max-w-2xl space-y-6">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />Account
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{user?.email}</span>
            </div>
            <div className="pt-3 border-t">
              <Button variant="secondary" onClick={signOut}>Sign Out</Button>
            </div>
          </div>
        </Card>

        <GmailSync />

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Target Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target Salary Min ($)" name="target_salary_min" id="target_salary_min" defaultValue="800000" />
            <Input label="Years Experience" name="years_experience" id="years_experience" defaultValue="20" />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />Data
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div><p className="font-medium">Export Data</p><p className="text-sm text-gray-600">Download as JSON</p></div>
              <Button variant="secondary" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div><p className="font-medium text-red-900">Delete All Data</p><p className="text-sm text-red-700">Cannot be undone</p></div>
              <Button variant="danger" size="sm"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
