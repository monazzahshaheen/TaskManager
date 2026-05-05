import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProject, createTask, updateTask, deleteTask,
  addMember, removeMember, updateMemberRole, deleteProject, searchUsers,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import {
  Plus, Trash2, Edit3, X, Users, Settings, ArrowLeft,
  ChevronDown, AlertCircle, Search, Crown, UserMinus,
} from 'lucide-react';

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/* ── Task Modal ─────────────────────────────────────────────────────── */
function TaskModal({ projectId, members, task, onClose }) {
  const isEdit = !!task;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'TODO',
    priority: task?.priority ?? 'MEDIUM',
    dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    assigneeId: task?.assignee?.id ?? '',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      isEdit
        ? updateTask(task.id, { ...form, dueDate: form.dueDate || null, assigneeId: form.assigneeId || null })
        : createTask(projectId, { ...form, dueDate: form.dueDate || null, assigneeId: form.assigneeId || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save task'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card w-full max-w-lg p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutate(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" className="input" value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select className="input" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Member Modal ───────────────────────────────────────────────────── */
function MemberModal({ projectId, members, ownerId, onClose }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e) {
    const val = e.target.value;
    setEmail(val);
    if (val.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await searchUsers(val);
      setSearchResults(data);
    } finally {
      setSearching(false);
    }
  }

  const { mutate: addMut, isPending: adding } = useMutation({
    mutationFn: () => addMember(projectId, { email, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member added');
      setEmail(''); setSearchResults([]);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add member'),
  });

  const { mutate: removeMut } = useMutation({
    mutationFn: (userId) => removeMember(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove member'),
  });

  const { mutate: updateRole } = useMutation({
    mutationFn: ({ userId, newRole }) => updateMemberRole(projectId, userId, newRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update role'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Manage Members</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Add member */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Add by email</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search email…"
              value={email}
              onChange={handleSearch}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg mb-2 divide-y divide-gray-100 shadow-sm">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setEmail(u.email); setSearchResults([]); }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  <span className="font-medium">{u.name}</span>
                  <span className="text-gray-400 ml-2">{u.email}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              onClick={() => addMut()}
              className="btn-primary whitespace-nowrap"
              disabled={!email || adding}
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Member list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {m.user.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.user.name}</p>
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.user.id === ownerId ? (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <Crown className="w-3 h-3" /> Owner
                  </span>
                ) : (
                  <>
                    <select
                      className="text-xs border border-gray-200 rounded px-1 py-0.5"
                      value={m.role}
                      onChange={(e) => updateRole({ userId: m.user.id, newRole: e.target.value })}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMut(m.user.id)}
                      className="text-red-500 hover:text-red-700 p-0.5"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Task Card ──────────────────────────────────────────────────────── */
function TaskCard({ task, isAdmin, onEdit, onDelete, onStatusChange }) {
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';

  return (
    <div className={`card p-4 hover:shadow-md transition-all ${overdue ? 'border-red-200' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-snug">{task.title}</h4>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <PriorityBadge priority={task.priority} />
        {overdue && (
          <span className="badge bg-red-100 text-red-600">
            <AlertCircle className="w-3 h-3 mr-0.5" />
            Overdue
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <select
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {task.assignee.name[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-500">{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}
      </div>

      {task.dueDate && (
        <div className={`mt-2 text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
          Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId).then((r) => r.data),
  });

  const isAdmin = project
    ? project.ownerId === user?.id ||
      project.members?.find((m) => m.user.id === user?.id)?.role === 'ADMIN'
    : false;

  const { mutate: delTask } = useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const { mutate: statusChange } = useMutation({
    mutationFn: ({ taskId, status }) => updateTask(taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
    onError: () => toast.error('Failed to update status'),
  });

  const { mutate: delProject } = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      navigate('/projects');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete project'),
  });

  function handleDeleteProject() {
    if (window.confirm('Delete this project and all its tasks? This cannot be undone.')) {
      delProject();
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="text-center py-20 text-gray-500">Project not found.</div>
  );

  const tasks = project.tasks ?? [];
  const filtered = filterStatus ? tasks.filter((t) => t.status === filterStatus) : tasks;

  // Board view: group tasks by status column
  const columns = STATUSES.map((status) => ({
    status,
    label: status.replace('_', ' '),
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span>{tasks.length} tasks</span>
              <span>•</span>
              <span>{project.members.length} members</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button onClick={() => setShowMemberModal(true)} className="btn-secondary">
                  <Users className="w-4 h-4" /> Members
                </button>
                <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="btn-primary">
                  <Plus className="w-4 h-4" /> New Task
                </button>
                {project.ownerId === user?.id && (
                  <button onClick={handleDeleteProject} className="btn-danger">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {['board', 'list'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}

        {activeTab === 'list' && (
          <div className="ml-auto">
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Board View */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(({ status, label, tasks: colTasks }) => (
            <div key={status} className="bg-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</h3>
                <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    onEdit={(t) => { setEditingTask(t); setShowTaskModal(true); }}
                    onDelete={(id) => { if (window.confirm('Delete this task?')) delTask(id); }}
                    onStatusChange={(taskId, status) => statusChange({ taskId, status })}
                  />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No tasks found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Assignee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Due</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{task.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <select
                        className="text-xs border border-gray-200 rounded px-2 py-1"
                        value={task.status}
                        onChange={(e) => statusChange({ taskId: task.id, status: e.target.value })}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                      {task.assignee?.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                      {task.dueDate
                        ? <span className={isPast(new Date(task.dueDate)) && task.status !== 'DONE' ? 'text-red-500 font-medium' : ''}>
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (window.confirm('Delete this task?')) delTask(task.id); }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          projectId={projectId}
          members={project.members}
          task={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        />
      )}
      {showMemberModal && (
        <MemberModal
          projectId={projectId}
          members={project.members}
          ownerId={project.ownerId}
          onClose={() => setShowMemberModal(false)}
        />
      )}
    </div>
  );
}
