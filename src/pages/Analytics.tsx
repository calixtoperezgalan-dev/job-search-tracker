import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card } from '../components/ui';
import { TrendingUp, DollarSign, Calendar, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  applied: '#3B82F6',
  recruiter_screen: '#8B5CF6',
  hiring_manager: '#6366F1',
  interviews: '#F59E0B',
  offer: '#10B981',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
  follow_up: '#EC4899',
};

const FIT_COLORS = ['#EF4444', '#F59E0B', '#10B981'];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [appsRes, historyRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*')
          .eq('user_id', user?.id)
          .order('application_date', { ascending: false }),
        supabase
          .from('application_status_history')
          .select('*')
          .eq('user_id', user?.id)
          .order('changed_at', { ascending: false })
          .limit(100),
      ]);

      setApplications(appsRes.data || []);
      setStatusHistory(historyRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalApps = applications.length;
  const statusCounts = applications.reduce((acc: any, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const responseCount =
    (statusCounts.recruiter_screen || 0) +
    (statusCounts.hiring_manager || 0) +
    (statusCounts.interviews || 0) +
    (statusCounts.offer || 0);

  const responseRate = totalApps > 0 ? ((responseCount / totalApps) * 100).toFixed(1) : '0';

  const interviewCount =
    (statusCounts.interviews || 0) +
    (statusCounts.hiring_manager || 0) +
    (statusCounts.offer || 0);

  const interviewRate = totalApps > 0 ? ((interviewCount / totalApps) * 100).toFixed(1) : '0';

  const pipelineValue = applications
    .filter(app => ['interviews', 'hiring_manager', 'offer'].includes(app.status))
    .reduce((sum, app) => sum + (app.salary_max || 0), 0);

  // Status distribution data
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    value: count,
    color: STATUS_COLORS[status] || '#6B7280',
  }));

  // Applications over time
  const appsByMonth = applications.reduce((acc: any, app) => {
    const month = new Date(app.application_date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const timelineData = Object.entries(appsByMonth)
    .map(([month, count]) => ({ month, applications: count }))
    .reverse()
    .slice(-6);

  // Fit score distribution
  const fitScores = applications.filter(app => app.fit_score !== null);
  const fitDistribution = [
    {
      name: '0-59 (Low)',
      value: fitScores.filter(app => app.fit_score < 60).length,
      color: FIT_COLORS[0],
    },
    {
      name: '60-79 (Medium)',
      value: fitScores.filter(app => app.fit_score >= 60 && app.fit_score < 80).length,
      color: FIT_COLORS[1],
    },
    {
      name: '80-100 (High)',
      value: fitScores.filter(app => app.fit_score >= 80).length,
      color: FIT_COLORS[2],
    },
  ];

  // Industry breakdown
  const industryCount = applications.reduce((acc: any, app) => {
    if (app.industry) {
      acc[app.industry] = (acc[app.industry] || 0) + 1;
    }
    return acc;
  }, {});

  const industryData = Object.entries(industryCount)
    .map(([industry, count]) => ({ industry, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  // Salary distribution
  const salaryRanges = applications
    .filter(app => app.salary_max)
    .map(app => app.salary_max / 1000);

  const salaryBuckets = {
    '<$300K': salaryRanges.filter(s => s < 300).length,
    '$300-500K': salaryRanges.filter(s => s >= 300 && s < 500).length,
    '$500-800K': salaryRanges.filter(s => s >= 500 && s < 800).length,
    '$800K+': salaryRanges.filter(s => s >= 800).length,
  };

  const salaryData = Object.entries(salaryBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  if (loading) {
    return (
      <Layout title="Analytics" subtitle="Track your job search performance">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (totalApps === 0) {
    return (
      <Layout title="Analytics" subtitle="Track your job search performance">
        <Card className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
          <p className="text-gray-600">Add some applications to see analytics</p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Analytics" subtitle="Track your job search performance">
      <div className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{totalApps}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold text-gray-900">{responseRate}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Interview Rate</p>
                <p className="text-3xl font-bold text-gray-900">{interviewRate}%</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${(pipelineValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Applications Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Top Industries</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={industryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="industry" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Salary Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 3 */}
        {fitScores.length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Fit Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fitDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B">
                  {fitDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </Layout>
  );
}
