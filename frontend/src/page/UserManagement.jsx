import React, { useEffect, useState } from 'react';
import { Calendar, ImagePlus, LayoutGrid, List, Mail, Pencil, Phone, Trash2, UserPlus, X } from 'lucide-react';
import API from '../api';

export default function UserManagement() {
  const [viewType, setViewType] = useState('card');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // user object being edited
  const [deleteTarget, setDeleteTarget] = useState(null); // user to confirm delete
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emptyForm = {
    name: '', email: '', password: '',
    badgeNumber: '', station: '', phone: '', profileImage: null,
  };
  const [newUser, setNewUser] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const defaultImage =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

  const getImageUrl = (image) => {
    if (!image) return defaultImage;
    if (image.startsWith('http')) return image;
    return `http://localhost:5000${image}`;
  };

  const formatJoinedDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ── ADD ──────────────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return;
    try {
      setSaving(true);
      setError('');
      const formData = new FormData();
      formData.append('name', newUser.name);
      formData.append('email', newUser.email);
      formData.append('password', newUser.password);
      formData.append('badgeNumber', newUser.badgeNumber);
      formData.append('station', newUser.station);
      formData.append('phone', newUser.phone);
      if (newUser.profileImage) formData.append('profileImage', newUser.profileImage);

      const res = await API.post('/users/create-investigator', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUsers([res.data.user, ...users]);
      setNewUser(emptyForm);
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  // ── EDIT ─────────────────────────────────────────────────────────────────
  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      badgeNumber: user.badgeNumber || '',
      station: user.station || '',
      phone: user.phone || '',
      profileImage: null,
    });
    setError('');
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('email', editForm.email);
      formData.append('badgeNumber', editForm.badgeNumber);
      formData.append('station', editForm.station);
      formData.append('phone', editForm.phone);
      if (editForm.password.trim()) formData.append('password', editForm.password);
      if (editForm.profileImage) formData.append('profileImage', editForm.profileImage);

      const res = await API.patch(`/users/${editUser._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUsers((prev) => prev.map((u) => u._id === editUser._id ? res.data.user : u));
      setEditUser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setError('');
      await API.delete(`/users/${deleteTarget._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 p-6 md:p-12 font-sans selection:bg-cyan-500 selection:text-slate-950">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent from-cyan-400 to-teal-400">
            User Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage, edit, and add system users here.</p>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setViewType('card')}
              className={`p-2 rounded-lg transition-all ${viewType === 'card' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            ><LayoutGrid size={18} /></button>
            <button
              onClick={() => setViewType('table')}
              className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            ><List size={18} /></button>
          </div>
          <button
            onClick={() => { setError(''); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-cyan-500/10"
          >
            <UserPlus size={18} /><span>Add User</span>
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-slate-400 text-sm">Loading users...</div>
        ) : viewType === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user._id}
                className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 relative overflow-hidden group backdrop-blur-sm"
              >
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-all" />
                <div className="absolute right-4 top-4 flex gap-1">
                  <button onClick={() => openEditModal(user)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Edit user">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteTarget(user)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete user">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <img src={getImageUrl(user.profileImage)} alt={user.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-cyan-500 transition-all" />
                  <div>
                    <h3 className="font-semibold text-lg text-slate-200 group-hover:text-cyan-400 transition-colors pr-16">{user.name}</h3>
                    <span className="inline-block text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md mt-1 border border-slate-700">{user.role}</span>
                  </div>
                </div>
                <div className="mt-6 space-y-2.5 text-sm text-slate-400">
                  <div className="flex items-center gap-2"><Mail size={14} className="text-slate-500" />{user.email}</div>
                  <div className="flex items-center gap-2"><Phone size={14} className="text-slate-500" />{user.phone || 'No phone'}</div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-500" />Joined: {formatJoinedDate(user.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-slate-800/30 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700/50 text-slate-400 text-sm">
                    <th className="p-4 pl-6">Image & Name</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <img src={getImageUrl(user.profileImage)} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700" />
                        <span className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">{user.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md text-xs border border-slate-700/50">{user.role}</span>
                      </td>
                      <td className="p-4 text-slate-400">{user.email}</td>
                      <td className="p-4 text-slate-400">{user.phone || 'No phone'}</td>
                      <td className="p-4 text-slate-500">{formatJoinedDate(user.createdAt)}</td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(user)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Edit">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setDeleteTarget(user)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <UserFormModal
          title="Add New User" subtitle="Please enter the correct information below."
          form={newUser} setForm={setNewUser} onSubmit={handleAddUser}
          onClose={() => { setIsAddModalOpen(false); setError(''); }}
          saving={saving} error={error} defaultImage={defaultImage} requirePassword
        />
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <UserFormModal
          title="Edit User" subtitle="Leave password blank to keep the current one."
          form={editForm} setForm={setEditForm} onSubmit={handleEditUser}
          onClose={() => { setEditUser(null); setError(''); }}
          saving={saving} error={error} defaultImage={defaultImage}
          currentImage={editUser.profileImage} requirePassword={false}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 to-rose-500" />
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 size={22} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Delete User</h2>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700/50 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">{deleteTarget.name}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all text-sm font-medium">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SHARED FORM MODAL ───────────────────────────────────────────────────── */
function UserFormModal({
  title, subtitle, form, setForm, onSubmit,
  onClose, saving, error, defaultImage, currentImage, requirePassword,
}) {
  const previewSrc = form.profileImage
    ? URL.createObjectURL(form.profileImage)
    : currentImage
    ? (currentImage.startsWith('http') ? currentImage : `http://localhost:5000${currentImage}`)
    : defaultImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-500 to-teal-500" />
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all">
          <X size={18} />
        </button>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Profile Image */}
          <Field label="Profile Image">
            <label className="flex items-center gap-4 bg-slate-800/50 border border-dashed border-slate-700/80 rounded-xl p-3 cursor-pointer hover:border-cyan-500 transition-all">
              <img src={previewSrc} alt="Preview" className="w-14 h-14 rounded-full object-cover ring-1 ring-slate-700" />
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <ImagePlus size={18} className="text-cyan-400" />
                <span>{form.profileImage ? form.profileImage.name : 'Choose image'}</span>
              </div>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => setForm({ ...form, profileImage: e.target.files?.[0] || null })} />
            </label>
          </Field>
          <Field label="Full Name">
            <input type="text" required placeholder="Hassan Ali" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
          </Field>
          <Field label="Email">
            <input type="email" required placeholder="hassan@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Badge Number">
              <input type="text" placeholder="POL-001" value={form.badgeNumber}
                onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
            </Field>
            <Field label="Phone">
              <input type="text" placeholder="+252 61..." value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Station">
              <input type="text" placeholder="Mogadishu HQ" value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
            </Field>
            <Field label={requirePassword ? 'Password' : 'New Password'}>
              <input type="password" required={requirePassword}
                placeholder={requirePassword ? 'Password' : 'Blank = no change'} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-md">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
