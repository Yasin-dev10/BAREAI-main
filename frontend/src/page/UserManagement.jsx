import React, { useEffect, useState } from 'react';
import { Calendar, ImagePlus, KeyRound, LayoutGrid, List, Mail, Pencil, Phone, RefreshCcw, Trash2, UserPlus, X } from 'lucide-react';
import API from '../api';

// ── Specialization config ─────────────────────────────────────────────────
const SPECIALIZATION_OPTIONS = [
  { value: 'murder',           label: 'Murder' },
  { value: 'robbery',          label: 'Robbery' },
  { value: 'terrorism',        label: 'Terrorism' },
  { value: 'sexual_assault',   label: 'Sexual Assault' },
  { value: 'financial_fraud',  label: 'Financial Fraud' },
  { value: 'drug_crimes',      label: 'Drug Crimes' },
  { value: 'cybercrime',       label: 'Cybercrime' },
  { value: 'general',          label: 'General' },
];

const getSpecLabel = (value) => SPECIALIZATION_OPTIONS.find((s) => s.value === value);
const getUserId = (user) => {
  const rawId = user?._id || user?.id;
  if (!rawId) return "";
  if (typeof rawId === "string") return rawId;
  if (rawId.$oid) return rawId.$oid;
  return String(rawId);
};

const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(value || "");

const normalizeUser = (user) => {
  const userId = getUserId(user);
  return userId ? { ...user, _id: userId, id: userId } : user;
};

function SpecBadge({ value, size = 'sm' }) {
  const spec = getSpecLabel(value);
  if (!spec) return null;
  return (
    <span
      key={value}
      className={`inline-flex items-center border rounded-lg font-medium text-cyan-300 border-cyan-500/30 bg-cyan-500/10 ${
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
    >
      {spec.label}
    </span>
  );
}

export default function UserManagement() {
  const [viewType, setViewType] = useState('card');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpTarget, setOtpTarget] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [addPendingUser, setAddPendingUser] = useState(null);
  const [addOtpValue, setAddOtpValue] = useState('');
  const [addOtpNotice, setAddOtpNotice] = useState('');
  const [addOtpError, setAddOtpError] = useState('');
  const [sendingAddOtp, setSendingAddOtp] = useState(false);
  const [verifyingAddOtp, setVerifyingAddOtp] = useState(false);

  const emptyForm = { name: '', email: '', badgeNumber: '', station: '', phone: '', profileImage: null, specializations: [] };
  const [newUser, setNewUser] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '', badgeNumber: '', station: '', phone: '', profileImage: null, specializations: [] });

  const specCounts = React.useMemo(() => {
    const counts = {};
    users.forEach((u) => {
      const specs = u.specializations || [];
      specs.forEach((s) => {
        if (s) {
          counts[s] = (counts[s] || 0) + 1;
        }
      });
    });
    return counts;
  }, [users]);

  const defaultImage = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

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
      setSuccessMessage('');
      const res = await API.get('/users');
      setUsers((res.data || []).map(normalizeUser));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ── ADD ───────────────────────────────────────────────────────────────────
  const openOtpModal = (user, notice = '') => {
    setOtpTarget(user);
    setOtpValue('');
    setOtpError('');
    setOtpNotice(notice);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpTarget?.email) return;
    if (otpValue.trim().length !== 6) {
      setOtpError('Enter the 6-digit OTP code.');
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError('');
      setOtpNotice('');

      const res = await API.post('/auth/verify-otp', {
        email: otpTarget.email,
        otp: otpValue.trim(),
      });

      setUsers((prev) => prev.map((user) => (
        user.email === otpTarget.email
          ? { ...user, emailVerified: true, isPasswordChangeRequired: true }
          : user
      )));

      setSuccessMessage(res.data.message || 'Email verified successfully. The investigator must set their own password at first login.');
      setOtpTarget(null);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpTarget?.email) return;

    try {
      setResendingOtp(true);
      setOtpError('');
      setOtpNotice('');

      const res = await API.post('/auth/resend-otp', { email: otpTarget.email });
      setOtpValue('');
      setOtpNotice(res.data.message || 'A new verification code has been sent.');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend OTP code.');
    } finally {
      setResendingOtp(false);
    }
  };

  const resetAddVerification = () => {
    setAddPendingUser(null);
    setAddOtpValue('');
    setAddOtpNotice('');
    setAddOtpError('');
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setError('');
    setNewUser(emptyForm);
    resetAddVerification();
  };

  const upsertUser = (nextUser) => {
    const nextUserId = getUserId(nextUser);
    setUsers((prev) => {
      const existingIndex = prev.findIndex((user) => getUserId(user) === nextUserId);
      if (existingIndex === -1) return [nextUser, ...prev];

      return prev.map((user) => getUserId(user) === nextUserId ? nextUser : user);
    });
  };

  const handleSendAddOtp = async () => {
    if (!newUser.name || !newUser.email) return;
    try {
      setSendingAddOtp(true);
      setError('');
      setSuccessMessage('');
      setAddOtpError('');
      const formData = new FormData();
      formData.append('name', newUser.name);
      formData.append('email', newUser.email);
      formData.append('badgeNumber', newUser.badgeNumber);
      formData.append('station', newUser.station);
      formData.append('phone', newUser.phone);
      formData.append('specializations', JSON.stringify(newUser.specializations || []));
      if (newUser.profileImage) formData.append('profileImage', newUser.profileImage);

      const res = await API.post('/users/create-investigator', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const createdUser = normalizeUser(res.data.user);
      upsertUser(createdUser);
      setAddPendingUser(createdUser);
      setAddOtpValue('');
      setAddOtpNotice(res.data.message || 'Enter the OTP sent to the user email.');
    } catch (err) {
      setAddOtpError(err.response?.data?.message || 'Failed to send OTP code.');
    } finally {
      setSendingAddOtp(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addPendingUser?.email) {
      await handleSendAddOtp();
      return;
    }

    if (addOtpValue.trim().length !== 6) {
      setAddOtpError('Enter the 6-digit OTP code before saving.');
      return;
    }

    try {
      setVerifyingAddOtp(true);
      setAddOtpError('');
      setAddOtpNotice('');

      const res = await API.post('/auth/verify-otp', {
        email: addPendingUser.email,
        otp: addOtpValue.trim(),
      });

      setUsers((prev) => prev.map((user) => (
        user.email === addPendingUser.email
          ? { ...user, emailVerified: true, isPasswordChangeRequired: true }
          : user
      )));

      setSuccessMessage(res.data.message || 'Email verified successfully. The investigator must set their own password at first login.');
      closeAddModal();
    } catch (err) {
      setAddOtpError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingAddOtp(false);
    }
  };

  // ── EDIT ──────────────────────────────────────────────────────────────────
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
      specializations: user.specializations || [],
    });
    setError('');
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('email', editForm.email);
      formData.append('badgeNumber', editForm.badgeNumber);
      formData.append('station', editForm.station);
      formData.append('phone', editForm.phone);
      formData.append('specializations', JSON.stringify(editForm.specializations || []));
      if (editForm.password.trim()) formData.append('password', editForm.password);
      if (editForm.profileImage) formData.append('profileImage', editForm.profileImage);

      const editUserId = getUserId(editUser);
      const res = await API.patch(`/users/${editUserId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUsers((prev) => prev.map((u) => getUserId(u) === editUserId ? normalizeUser(res.data.user) : u));
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
    const deleteTargetId = getUserId(deleteTarget);
    const deleteTargetEmail = deleteTarget.email?.trim().toLowerCase();
    const canDeleteById = isMongoObjectId(deleteTargetId);

    if (!canDeleteById && !deleteTargetEmail) {
      setError('Could not delete user because the user ID and email are missing. Please refresh and try again.');
      setDeleteTarget(null);
      return;
    }

    try {
      setError('');
      if (canDeleteById) {
        await API.delete(`/users/${deleteTargetId}`);
      } else {
        await API.delete(`/users/by-email/${encodeURIComponent(deleteTargetEmail)}`);
      }
      setUsers((prev) => prev.filter((u) => (
        canDeleteById
          ? getUserId(u) !== deleteTargetId
          : u.email?.trim().toLowerCase() !== deleteTargetEmail
      )));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans p-6 md:p-12 transition-colors duration-300" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="page-title brand-text">
            User Management
          </h1>
          <p className="page-subtitle">Manage, edit, and add system users here.</p>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          {successMessage && <p className="text-sm text-cyan-400 mt-2">{successMessage}</p>}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div
            className="flex p-1 rounded-xl border"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-base)",
            }}
          >
            <button
              onClick={() => setViewType('card')}
              className={`p-2 rounded-lg transition-all ${
                viewType === 'card' ? 'text-white shadow-md' : ''
              }`}
              style={
                viewType === 'card'
                  ? { backgroundColor: "var(--brand)" }
                  : { color: "var(--text-muted)" }
              }
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`p-2 rounded-lg transition-all ${
                viewType === 'table' ? 'text-white shadow-md' : ''
              }`}
              style={
                viewType === 'table'
                  ? { backgroundColor: "var(--brand)" }
                  : { color: "var(--text-muted)" }
              }
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={() => { setError(''); setSuccessMessage(''); setIsAddModalOpen(true); }}
            className="btn-primary shadow-md"
          >
            <UserPlus size={18} /><span>Add User</span>
          </button>
        </div>
      </div>

      {/* Category Stats Summary */}
      <div className="max-w-7xl mx-auto mb-8 bg-slate-800/20 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
          Users Per Case Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {SPECIALIZATION_OPTIONS.map((opt) => {
            const count = specCounts[opt.value] || 0;
            return (
              <div key={opt.value} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between min-w-0">
                <span className="text-[11px] text-white font-medium truncate mb-1" title={opt.label}>
                  {opt.label}
                </span>
                <span className="text-lg font-bold brand-text">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-slate-400 text-sm">Loading users...</div>
        ) : viewType === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div key={getUserId(user) || user.email} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group backdrop-blur-sm">
                <div className="card-accent-top" />
                <div className="absolute right-4 top-4 flex gap-1">
                  <button onClick={() => openEditModal(user)} className="p-2 rounded-lg text-slate-500 transition-all"><Pencil size={15} /></button>
                  <button onClick={() => setDeleteTarget(user)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={15} /></button>
                </div>
                <div className="flex items-center gap-4">
                  <img src={getImageUrl(user.profileImage)} alt={user.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-700 transition-all" />
                  <div>
                    <h3 className="font-semibold text-lg text-slate-200 transition-colors pr-16">{user.name}</h3>
                    <span className="inline-block text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md mt-1 border border-slate-700">{user.role}</span>
                  </div>
                </div>
                <div className="mt-6 space-y-2.5 text-sm text-slate-400">
                  <div className="flex items-center gap-2"><Mail size={14} className="text-slate-500" />{user.email}</div>
                  <div className="flex items-center gap-2"><Phone size={14} className="text-slate-500" />{user.phone || 'No phone'}</div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-500" />Joined: {formatJoinedDate(user.createdAt)}</div>
                </div>
                {user.specializations?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {user.specializations.filter(Boolean).map((s) => <SpecBadge key={s} value={s} size="xs" />)}
                  </div>
                )}
                {!user.emailVerified && (
                  <button
                    type="button"
                    onClick={() => openOtpModal(user, 'Enter the OTP sent to this user email.')}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm font-semibold text-amber-300 hover:border-amber-400 hover:bg-amber-500/15 transition-all"
                  >
                    <KeyRound size={16} /> Verify OTP
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700/50 text-slate-400 text-sm">
                    <th className="p-4 pl-6">Image & Name</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Specializations</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {users.map((user) => (
                    <tr key={getUserId(user) || user.email} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <img src={getImageUrl(user.profileImage)} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700" />
                        <span className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">{user.name}</span>
                      </td>
                      <td className="p-4"><span className="text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md text-xs border border-slate-700/50">{user.role}</span></td>
                      <td className="p-4">
                        {user.specializations?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.specializations.filter(Boolean).map((s) => <SpecBadge key={s} value={s} size="xs" />)}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400">{user.email}</td>
                      <td className="p-4 text-slate-400">{user.phone || 'No phone'}</td>
                      <td className="p-4 text-slate-500">{formatJoinedDate(user.createdAt)}</td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {!user.emailVerified && (
                            <button onClick={() => openOtpModal(user, 'Enter the OTP sent to this user email.')} className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"><KeyRound size={15} /></button>
                          )}
                          <button onClick={() => openEditModal(user)} className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"><Pencil size={15} /></button>
                          <button onClick={() => setDeleteTarget(user)} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={15} /></button>
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
          title="Add New User"
          subtitle="A verification code and password will be sent to the user's email only."
          form={newUser} setForm={setNewUser} onSubmit={handleAddUser}
          onSendOtp={handleSendAddOtp}
          onClose={closeAddModal}
          saving={verifyingAddOtp} error={error} defaultImage={defaultImage}
          isEdit={false}
          pendingUser={addPendingUser}
          otpValue={addOtpValue}
          setOtpValue={setAddOtpValue}
          otpNotice={addOtpNotice}
          otpError={addOtpError}
          sendingOtp={sendingAddOtp}
          verifyingOtp={verifyingAddOtp}
          specCounts={specCounts}
        />
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <UserFormModal
          title="Edit User"
          subtitle="Leave password blank to keep the current one."
          form={editForm} setForm={setEditForm} onSubmit={handleEditUser}
          onClose={() => { setEditUser(null); setError(''); }}
          saving={saving} error={error} defaultImage={defaultImage}
          currentImage={editUser.profileImage}
          isEdit={true}
          editingUser={editUser}
          specCounts={specCounts}
        />
      )}

      {/* OTP VERIFY MODAL */}
      {otpTarget && (
        <OtpVerificationModal
          user={otpTarget}
          otpValue={otpValue}
          setOtpValue={setOtpValue}
          onSubmit={handleVerifyOtp}
          onResend={handleResendOtp}
          onClose={() => setOtpTarget(null)}
          verifying={verifyingOtp}
          resending={resendingOtp}
          error={otpError}
          notice={otpNotice}
        />
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
            <div className="modal-accent-top modal-accent-top--danger rounded-t-2xl" />
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
              Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget.name}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all text-sm font-medium">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SHARED FORM MODAL ───────────────────────────────────────────────────── */
function OtpVerificationModal({
  user,
  otpValue,
  setOtpValue,
  onSubmit,
  onResend,
  onClose,
  verifying,
  resending,
  error,
  notice,
}) {
  const handleOtpChange = (value) => {
    setOtpValue(value.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="h-[3px] bg-amber-500" />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
        >
          <X size={18} />
        </button>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="pr-8">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
              <KeyRound size={22} className="text-amber-300" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Verify Email OTP</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter the 6-digit code for <span className="text-cyan-300 font-semibold">{user.email}</span>.
            </p>
          </div>

          {notice && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-xs text-cyan-300">
              {notice}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <Field label="OTP Code">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="Enter 6-digit OTP"
              value={otpValue}
              onChange={(e) => handleOtpChange(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.35em] font-black text-slate-100 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCcw size={15} /> {resending ? 'Sending...' : 'Resend OTP'}
            </button>
            <button
              type="submit"
              disabled={verifying || otpValue.length !== 6}
              className="flex-1 btn-primary justify-center"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserFormModal({
  title, subtitle, form, setForm, onSubmit,
  onClose, saving, error, defaultImage, currentImage, isEdit, editingUser,
  onSendOtp, pendingUser, otpValue, setOtpValue, otpNotice, otpError,
  sendingOtp, verifyingOtp,
  specCounts = {},
}) {
  const previewSrc = form.profileImage
    ? URL.createObjectURL(form.profileImage)
    : currentImage
    ? (currentImage.startsWith('http') ? currentImage : `http://localhost:5000${currentImage}`)
    : defaultImage;

  const handleInlineOtpChange = (value) => {
    setOtpValue?.(value.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      {/* Modal: flex column so footer is always visible */}
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">

        {/* Top accent bar */}
        <div className="modal-accent-top rounded-t-2xl z-10 pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all z-10"
        >
          <X size={18} />
        </button>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 pt-7 pb-2 min-h-0">

          {/* Header */}
          <div className="mb-5 pr-6">
            <h2 className="text-xl font-bold text-slate-100">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            {error && (
              <p className="text-sm text-red-400 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Status badges (edit only) */}
          {editingUser && (
            <div className="mb-5 space-y-2">
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold ${
                editingUser.emailVerified
                  ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400'
                  : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
              }`}>
                <span>📧 Email Verified</span>
                <span className="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-md border">
                  {editingUser.emailVerified ? '✓ YES' : '✗ PENDING'}
                </span>
              </div>
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold ${
                editingUser.isPasswordChangeRequired
                  ? 'border-red-500/20 bg-red-500/5 text-red-400'
                  : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400'
              }`}>
                <span>🔐 Password Status</span>
                <span className="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-md border">
                  {editingUser.isPasswordChangeRequired ? '⚠ REQUIRED' : '✓ OK'}
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form id="user-form" onSubmit={onSubmit} className="space-y-4 pb-2">
            {/* Profile Image */}
            <Field label="Profile Image">
              <label className="flex items-center gap-4 bg-slate-800/50 border border-dashed border-slate-700/80 rounded-xl p-3 cursor-pointer hover:border-cyan-500 transition-all">
                <img src={previewSrc} alt="Preview" className="w-14 h-14 rounded-full object-cover ring-1 ring-slate-700 shrink-0" />
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <ImagePlus size={18} className="text-cyan-400 shrink-0" />
                  <span className="truncate">{form.profileImage ? form.profileImage.name : 'Choose image'}</span>
                </div>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setForm({ ...form, profileImage: e.target.files?.[0] || null })} />
              </label>
            </Field>

            <Field label="Full Name">
              <input
                type="text" required placeholder="Enter Full Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
              />
            </Field>

            <Field label="Email">
              <input
                type="email" required placeholder="Enter email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Badge Number">
                <input
                  type="text" placeholder="POL-001" value={form.badgeNumber || ''}
                  onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="text" placeholder="+252 61..." value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                />
              </Field>
            </div>

            <div className={`grid gap-4 ${isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Field label="Station">
                <input
                  type="text" placeholder="Mogadishu HQ" value={form.station || ''}
                  onChange={(e) => setForm({ ...form, station: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                />
              </Field>
              {isEdit && (
                <Field label="New Password">
                  <input
                    type="password" placeholder="Blank = no change" value={form.password || ''}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                  />
                </Field>
              )}
            </div>

            {/* Specializations */}
            <Field label="Specializations">
              <SpecializationSelector
                value={form.specializations || []}
                onChange={(specs) => setForm({ ...form, specializations: specs })}
                specCounts={specCounts}
              />
            </Field>
            {/* Auto-password notice (add mode only) */}
            {!isEdit && (
              <>
                {otpNotice && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-xs text-cyan-300">
                    {otpNotice}
                  </div>
                )}

                {otpError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                    {otpError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onSendOtp}
                  disabled={sendingOtp || !form.name || !form.email}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/70 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-300 transition-all hover:border-amber-300 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <KeyRound size={17} />
                  {sendingOtp ? 'Sending OTP...' : pendingUser ? 'Resend OTP' : 'Verify OTP'}
                </button>

                {pendingUser && (
                  <Field label="OTP Code">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit OTP"
                      value={otpValue || ''}
                      onChange={(e) => handleInlineOtpChange(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3 text-center text-xl tracking-[0.3em] font-black text-slate-100 focus:outline-none focus:border-cyan-500 transition-all"
                    />
                  </Field>
                )}

                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs">
                  <span className="mt-0.5 shrink-0">🔒</span>
                  <span>Password is auto-generated and emailed to the user only.</span>
                </div>
              </>
            )}
          </form>
        </div>

        {/* ── Sticky footer — always visible ── */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={
              isEdit
                ? saving
                : (verifyingOtp || !pendingUser || (otpValue || '').length !== 6)
            }
            className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-medium shadow-md disabled:opacity-50"
          >
            {isEdit
              ? (saving ? 'Saving...' : 'Save')
              : (verifyingOtp ? 'Verifying...' : 'Verify & Finish')}
          </button>
        </div>
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

function SpecializationSelector({ value = [], onChange, specCounts = {} }) {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const toggle = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((s) => s !== val));
    } else {
      onChange([...value, val]);
    }
    // Keep dropdown open after selection
  };

  const selectedLabels = value
    .map((v) => getSpecLabel(v)?.label)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-all"
      >
        <span className={value.length === 0 ? 'text-slate-500' : 'text-slate-200 truncate pr-2'}>
          {value.length === 0 ? 'Select case categories...' : selectedLabels}
        </span>
        <svg
          className={`shrink-0 w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown list — stays open while selecting */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {SPECIALIZATION_OPTIONS.map((opt) => {
            const selected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur/outside-click from closing before toggle runs
                  e.preventDefault();
                  toggle(opt.value);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${
                  selected
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{opt.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60 font-semibold">
                    {specCounts[opt.value] || 0}
                  </span>
                </div>
                {selected && (
                  <svg className="w-4 h-4 shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
