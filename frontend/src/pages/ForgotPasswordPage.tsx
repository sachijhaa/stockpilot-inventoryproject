import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure reset link">
      {sent ? (
        <div className="text-center py-4">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
          <p className="text-slate-300 text-sm">If an account exists for {email}, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <div className="mt-5 pt-5 border-t border-white/10 text-center text-sm text-slate-500">
        <Link to="/login" className="text-accent-cyan hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
