import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard().then((r) => r.data),
  });

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: 'Projects', value: data?.totalProjects ?? 0, icon: FolderKanban, color: 'blue' },
    { label: 'Assigned Tasks', value: data?.assignedTasks ?? 0, icon: CheckCircle2, color: 'green' },
    { label: 'In Progress', value: data?.tasksByStatus?.IN_PROGRESS ?? 0, icon: Clock, color: 'yellow' },
    { label: 'Overdue', value: data?.overdueTasks?.length ?? 0, icon: AlertTriangle, color: 'red' },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your project overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`inline-flex p-2.5 rounded-lg ${colorMap[color]} mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Task status breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Task Status Breakdown</h2>
          <div className="space-y-3">
            {[
              { key: 'TODO', label: 'To Do', color: 'bg-gray-400' },
              { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
              { key: 'REVIEW', label: 'In Review', color: 'bg-yellow-500' },
              { key: 'DONE', label: 'Done', color: 'bg-green-500' },
            ].map(({ key, label, color }) => {
              const count = data?.tasksByStatus?.[key] ?? 0;
              const total = data?.assignedTasks || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue tasks */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Overdue Tasks
          </h2>
          {data?.overdueTasks?.length === 0 ? (
            <p className="text-gray-400 text-sm">No overdue tasks 🎉</p>
          ) : (
            <div className="space-y-3">
              {data?.overdueTasks?.map((task) => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project.name}</p>
                  </div>
                  <span className="text-xs text-red-600 font-medium">
                    {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {data?.recentTasks?.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent tasks</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data?.recentTasks?.map((task) => (
              <Link
                key={task.id}
                to={`/projects/${task.project.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {task.assignee?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project.name}</p>
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
