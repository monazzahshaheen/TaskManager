import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject } from '../lib/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, FolderKanban, Users, CheckSquare, X } from 'lucide-react';

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="card p-6 hover:shadow-md hover:border-blue-200 transition-all block group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <FolderKanban className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs text-gray-400">
          {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{project.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <CheckSquare className="w-3.5 h-3.5" />
          {project._count?.tasks ?? 0} tasks
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {project._count?.members ?? 0} members
        </span>
      </div>
    </Link>
  );
}

function NewProjectModal({ onClose }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => createProject(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">New Project</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="input"
              placeholder="My awesome project"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="What's this project about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [showModal, setShowModal] = useState(false);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects().then((r) => r.data),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-500 font-medium">No projects yet</h3>
          <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
