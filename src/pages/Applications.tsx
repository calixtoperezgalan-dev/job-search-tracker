import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Button, Badge, Modal, Input, Select } from '../components/ui';
import { Plus, Search, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import DriveImport from '../components/DriveImport';

interface Application {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  application_date: string;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  fit_score: number | null;
  google_drive_file_id: string | null;
  company_size: string | null;
  industry: string | null;
  company_type: string | null;
}

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'recruiter_screen', label: 'Recruiter Screen' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800',
  recruiter_screen: 'bg-purple-100 text-purple-800',
  hiring_manager: 'bg-indigo-100 text-indigo-800',
  interviews: 'bg-amber-100 text-amber-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    company_name: '', job_title: '', status: 'applied', application_date: new Date().toISOString().split('T')[0],
    salary_min: '', salary_max: '', location: ''
  });

  useEffect(() => { if (user) fetchApplications(); }, [user]);

  const fetchApplications = async () => {
    try {
      const { data } = await supabase.from('applications').select('*').eq('user_id', user?.id).order('application_date', { ascending: false });
      setApplications(data || []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('applications').insert({
        user_id: user?.id, company_name: formData.company_name, job_title: formData.job_title,
        status: formData.status, application_date: formData.application_date,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        location: formData.location || null
      });
      setShowModal(false);
      setFormData({ company_name: '', job_title: '', status: 'applied', application_date: new Date().toISOString().split('T')[0], salary_min: '', salary_max: '', location: '' });
      fetchApplications();
    } catch (error) { console.error('Error:', error); alert('Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    await supabase.from('applications').delete().eq('id', id);
    fetchApplications();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected application(s)?`)) return;

    for (const id of selectedIds) {
      await supabase.from('applications').delete().eq('id', id);
    }

    setSelectedIds(new Set());
    fetchApplications();
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(app => app.id)));
    }
  };

  const filtered = applications.filter(a =>
    (a.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || a.job_title.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'all' || a.status === statusFilter)
  );

  return (
    <Layout title="Applications" subtitle={`${applications.length} total applications`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              id="search"
              name="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
          <select
            id="statusFilter"
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="secondary" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedIds.size} Selected
            </Button>
          )}
          <DriveImport onComplete={fetchApplications} />
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Add Application</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600 mb-4">No applications found</p>
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Add Your First Application</Button>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((app) => (
                <tr key={app.id} className={`hover:bg-gray-50 ${selectedIds.has(app.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(app.id)}
                      onChange={() => toggleSelection(app.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{app.company_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{app.job_title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{app.industry || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{app.company_size || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{app.company_type || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={STATUS_COLORS[app.status] || 'bg-gray-100'}>{app.status.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{format(new Date(app.application_date), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {app.salary_max ? `$${(app.salary_max / 1000).toFixed(0)}K` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {app.fit_score ? <Badge className={app.fit_score >= 80 ? 'bg-green-100 text-green-800' : app.fit_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{app.fit_score}</Badge> : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {app.google_drive_file_id && (
                        <button onClick={() => window.open(`https://drive.google.com/file/d/${app.google_drive_file_id}`, '_blank')} className="p-1 hover:bg-gray-100 rounded">
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => handleDelete(app.id)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Application" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company Name *" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} required />
            <Input label="Job Title *" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} required />
            <Select label="Status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} options={STATUS_OPTIONS} />
            <Input label="Application Date" type="date" value={formData.application_date} onChange={(e) => setFormData({...formData, application_date: e.target.value})} />
            <Input label="Salary Min ($)" type="number" value={formData.salary_min} onChange={(e) => setFormData({...formData, salary_min: e.target.value})} />
            <Input label="Salary Max ($)" type="number" value={formData.salary_max} onChange={(e) => setFormData({...formData, salary_max: e.target.value})} />
            <div className="col-span-2">
              <Input label="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">Add Application</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
