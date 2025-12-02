import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card } from '../components/ui';
import { Briefcase, TrendingUp, Users, Target, Plus, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, responses: 0, interviews: 0, meetsTarget: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data } = await supabase.from('applications').select('status, salary_max').eq('user_id', user?.id);
      if (data) {
        const total = data.length;
        const responses = data.filter(a => ['recruiter_screen', 'hiring_manager', 'interviews', 'offer'].includes(a.status)).length;
        const interviews = data.filter(a => ['interviews', 'offer'].includes(a.status)).length;
        const meetsTarget = data.filter(a => a.salary_max && a.salary_max >= 800000).length;
        setStats({ total, responses, interviews, meetsTarget });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const responseRate = stats.total > 0 ? ((stats.responses / stats.total) * 100).toFixed(1) : '0';
  const interviewRate = stats.total > 0 ? ((stats.interviews / stats.total) * 100).toFixed(1) : '0';

  return (
    <Layout title="Dashboard" subtitle="Your job search at a glance">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold">{loading ? '-' : stats.total}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold">{loading ? '-' : `${responseRate}%`}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Interview Rate</p>
              <p className="text-2xl font-bold">{loading ? '-' : `${interviewRate}%`}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Target className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Meet $800K Target</p>
              <p className="text-2xl font-bold">{loading ? '-' : stats.meetsTarget}</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="max-w-md">
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/applications')} className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <Plus className="w-5 h-5 text-blue-600" />
              <span>Add New Application</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
              <Upload className="w-5 h-5 text-green-600" />
              <span>Import from Google Drive</span>
            </button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
