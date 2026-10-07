import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@inventory.io');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data.user, data.data.accessToken);
      toast.success(`Welcome back, ${data.data.user.name.split(' ')[0]}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Smart Inventory workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-accent-cyan hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-5 pt-5 border-t border-white/10 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/signup" className="text-accent-cyan hover:underline">
          Create one
        </Link>
      </div>

      <div className="mt-4 text-[11px] text-slate-600 text-center leading-relaxed">
        Demo logins (password: Password@123):<br />
        admin@inventory.io · manager@inventory.io · sales@inventory.io
      </div>
    </AuthLayout>
  );
}
