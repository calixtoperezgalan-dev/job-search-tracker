import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, BarChart3, Lightbulb, Settings, Target } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Applications', href: '/applications', icon: Briefcase },
  { name: 'Networking', href: '/networking', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'AI Insights', href: '/insights', icon: Lightbulb },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const deadline = new Date('2026-03-02');
  const today = new Date();
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200">
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Job Tracker</h1>
          <p className="text-xs text-gray-500">Executive Search</p>
        </div>
      </div>
      <nav className="px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50 text-center">
        <p className="text-xs font-medium text-gray-500 uppercase">Target Offer Date</p>
        <p className="text-lg font-bold text-blue-600">Mar 2, 2026</p>
        <p className={`text-sm font-semibold ${daysLeft < 30 ? 'text-red-600' : daysLeft < 60 ? 'text-yellow-600' : 'text-green-600'}`}>
          {daysLeft} days remaining
        </p>
      </div>
    </aside>
  );
}
