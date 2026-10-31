import React, { useState } from 'react';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../services/authService';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function Settings() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    let passwordChanged = false;
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      passwordChanged = true;
      sessionStorage.setItem('cm_notice', 'Password changed successfully. Sign in again with your new password.');
      await logout();
      reset();
      navigate('/login', { replace: true });
    } catch (err) {
      if (passwordChanged) {
        navigate('/login', { replace: true });
      } else {
        setServerError(err.response?.data?.error?.message || 'Failed to change password.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-2xl">
        {/* Profile info */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Administrator Profile</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-4"><span className="text-gray-500 w-24">Username</span><span className="font-medium">{admin?.username}</span></div>
            <div className="flex gap-4"><span className="text-gray-500 w-24">Email</span><span>{admin?.email}</span></div>
            <div className="flex gap-4"><span className="text-gray-500 w-24">Role</span><span className="capitalize">{admin?.role}</span></div>
            <div className="flex gap-4"><span className="text-gray-500 w-24">Last Login</span><span className="text-xs text-gray-400">{admin?.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('en-PH') : 'N/A'}</span></div>
          </div>
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h3>

          {serverError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              <AlertCircle size={15} />{serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { id: 'currentPassword', label: 'Current Password' },
              { id: 'newPassword', label: 'New Password' },
              { id: 'confirmPassword', label: 'Confirm New Password' },
            ].map(({ id, label }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                <input id={id} type="password" autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined} className={`input ${errors[id] ? 'border-red-400' : ''}`} {...register(id)} />
                {errors[id] && <p id={`${id}-error`} role="alert" className="text-red-500 text-xs mt-1">{errors[id].message}</p>}
              </div>
            ))}
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Change Password
            </button>
          </form>
        </div>

        <div className="card bg-amber-50 border-amber-200">
          <h3 className="text-xs font-semibold text-amber-800 mb-1">Security Notes</h3>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>To add more administrators, use the CLI: <code className="font-mono bg-amber-100 px-1 rounded">npm run bootstrap:admin</code> with different bootstrap env vars.</li>
            <li>Integration credentials are managed through environment variables, not this UI.</li>
            <li>Sessions expire after 8 hours of inactivity.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
