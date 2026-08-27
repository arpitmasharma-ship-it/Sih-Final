import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { LogIn } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { login } from '../../redux/slices/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState } = useForm();
  const error = useSelector((s) => s.auth.error);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(login(data)).unwrap();
      navigate('/', { replace: true });
    } catch (e) {
      // error surfaced via slice state
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Access the compliance intelligence platform.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Official e-mail"
          type="email"
          autoComplete="username"
          placeholder="officer@department.gov.in"
          error={formState.errors.email?.message}
          {...register('email', { required: 'E-mail is required' })}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={submitting} icon={LogIn}>
          Sign in
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-slate-500">
        Contact your administrator to create an account.
      </div>
    </AuthLayout>
  );
}
