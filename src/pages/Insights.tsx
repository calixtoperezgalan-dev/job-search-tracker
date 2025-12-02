import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Card, Button, Badge } from '../components/ui';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Users,
  Briefcase,
  Loader,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateInsights } from '../lib/api';

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  content: any;
  generated_at: string;
  is_read: boolean;
}

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const URGENCY_COLORS = {
  immediate: 'bg-red-100 text-red-800',
  this_week: 'bg-orange-100 text-orange-800',
  next_week: 'bg-yellow-100 text-yellow-800',
};

export default function Insights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user]);

  useEffect(() => {
    if (insights.length > 0 && !selectedInsight) {
      setSelectedInsight(insights[0]);
    }
  }, [insights]);

  const fetchInsights = async () => {
    try {
      const { data } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user?.id)
        .order('generated_at', { ascending: false })
        .limit(10);

      setInsights(data || []);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateInsights();
      await fetchInsights();
    } catch (error: any) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Layout title="AI Insights" subtitle="Strategic recommendations for your job search">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (insights.length === 0) {
    return (
      <Layout title="AI Insights" subtitle="Strategic recommendations for your job search">
        <Card className="text-center py-12">
          <Sparkles className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Insights Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Generate AI-powered strategic recommendations for your job search
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {generating ? 'Generating...' : 'Generate First Insights'}
          </Button>
        </Card>
      </Layout>
    );
  }

  const insight = selectedInsight?.content;

  return (
    <Layout
      title="AI Insights"
      subtitle="Strategic recommendations for your job search"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              Last generated:{' '}
              {new Date(selectedInsight?.generated_at || '').toLocaleDateString()}
            </span>
          </div>
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {generating ? 'Generating...' : 'Refresh Insights'}
          </Button>
        </div>

        {/* Executive Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Executive Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {insight?.executive_summary}
              </p>
            </div>
          </div>
        </Card>

        {/* Pipeline Health */}
        {insight?.pipeline_health && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Pipeline Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Badge
                  className={
                    insight.pipeline_health.status === 'healthy'
                      ? 'bg-green-100 text-green-800'
                      : insight.pipeline_health.status === 'at_risk'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }
                >
                  {insight.pipeline_health.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  Probability of Feb Offer
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {insight.pipeline_health.probability_of_feb_offer}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Apps Needed/Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insight.pipeline_health.applications_needed_per_week}
                </p>
              </div>
            </div>
            <p className="text-gray-700">{insight.pipeline_health.explanation}</p>
          </Card>
        )}

        {/* What's Working / Not Working */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insight?.whats_working && insight.whats_working.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                What's Working
              </h3>
              <ul className="space-y-2">
                {insight.whats_working.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {insight?.whats_not_working && insight.whats_not_working.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                What's Not Working
              </h3>
              <ul className="space-y-2">
                {insight.whats_not_working.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Immediate Actions */}
        {insight?.immediate_actions && insight.immediate_actions.length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Immediate Actions
            </h3>
            <div className="space-y-3">
              {insight.immediate_actions.map((action: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    PRIORITY_COLORS[action.priority as keyof typeof PRIORITY_COLORS] ||
                    'bg-gray-50 text-gray-800 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{action.action}</p>
                    <div className="flex gap-2">
                      <Badge className="text-xs">
                        {action.priority}
                      </Badge>
                      <Badge className="text-xs bg-gray-100 text-gray-700">
                        {action.effort}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm opacity-90">{action.rationale}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Follow-up Priorities */}
        {insight?.follow_up_priorities &&
          insight.follow_up_priorities.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Follow-up Priorities
              </h3>
              <div className="space-y-3">
                {insight.follow_up_priorities.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-lg flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{item.company}</p>
                        <Badge className={URGENCY_COLORS[item.urgency as keyof typeof URGENCY_COLORS]}>
                          {item.urgency.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {item.current_status} • {item.days_since_update} days
                        since update
                      </p>
                      <p className="text-sm text-gray-700">
                        {item.recommended_action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        {/* Networking Actions */}
        {insight?.networking_actions && insight.networking_actions.length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Networking Actions
            </h3>
            <div className="space-y-3">
              {insight.networking_actions.map((action: any, idx: number) => (
                <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="font-medium text-gray-900 mb-1">
                    {action.contact_name || action.action}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">{action.action}</p>
                  <p className="text-xs text-gray-600">{action.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Companies to Target */}
        {insight?.companies_to_target &&
          insight.companies_to_target.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                Companies to Target
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insight.companies_to_target.map((company: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-indigo-50 rounded-lg border border-indigo-100"
                  >
                    <p className="font-medium text-gray-900 mb-2">
                      {company.company}
                    </p>
                    <p className="text-sm text-gray-700 mb-3">
                      {company.why_good_fit}
                    </p>
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        Likely Roles:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {company.likely_roles.map((role: string, roleIdx: number) => (
                          <Badge
                            key={roleIdx}
                            className="text-xs bg-indigo-100 text-indigo-800"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Approach:</span>{' '}
                      {company.approach}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

        {/* Weekly Targets */}
        {insight?.weekly_targets && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <h3 className="font-semibold text-gray-900 mb-4">Weekly Targets</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700">
                  {insight.weekly_targets.new_applications}
                </p>
                <p className="text-sm text-gray-600">New Applications</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700">
                  {insight.weekly_targets.follow_ups}
                </p>
                <p className="text-sm text-gray-600">Follow-ups</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700">
                  {insight.weekly_targets.networking_conversations}
                </p>
                <p className="text-sm text-gray-600">Networking Convos</p>
              </div>
            </div>
          </Card>
        )}

        {/* Risk Alerts */}
        {insight?.risk_alerts && insight.risk_alerts.length > 0 && (
          <Card className="bg-red-50 border-red-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Risk Alerts
            </h3>
            <div className="space-y-3">
              {insight.risk_alerts.map((alert: any, idx: number) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-red-200">
                  <p className="font-medium text-red-900 mb-2">{alert.risk}</p>
                  <p className="text-sm text-gray-700">{alert.mitigation}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
