import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset. Please log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8+ chars, 1 uppercase, 1 number"
          required
        />
        <Button type="submit" className="w-full" loading={loading} disabled={!token}>
          Reset Password
        </Button>
        {!token && <p className="text-xs text-danger text-center">Missing or invalid reset token.</p>}
      </form>
      <div className="mt-5 pt-5 border-t border-white/10 text-center text-sm text-slate-500">
        <Link to="/login" className="text-accent-cyan hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
