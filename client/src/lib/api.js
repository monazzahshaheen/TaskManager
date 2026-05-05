import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/auth/login', data);
export const signup = (data) => api.post('/auth/signup', data);
export const getMe = () => api.get('/auth/me');

// Projects
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Members
export const addMember = (projectId, data) => api.post(`/projects/${projectId}/members`, data);
export const removeMember = (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`);
export const updateMemberRole = (projectId, userId, role) =>
  api.patch(`/projects/${projectId}/members/${userId}`, { role });

// Tasks
export const getTasks = (projectId, params) => api.get(`/tasks/project/${projectId}`, { params });
export const createTask = (projectId, data) => api.post(`/tasks/project/${projectId}`, data);
export const updateTask = (taskId, data) => api.put(`/tasks/${taskId}`, data);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);

// Users
export const searchUsers = (email) => api.get('/users/search', { params: { email } });

// Dashboard
export const getDashboard = () => api.get('/dashboard');
