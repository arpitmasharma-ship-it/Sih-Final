import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { register as registerUser } from '../../redux/slices/authSlice';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError('');
    try {
      await dispatch(register(data)).unwrap();
      toast.success('Account created. You can sign in now.');
      navigate('/login');
    } catch (e) {
      setServerError(e || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Authorized analysts can self-register; officer roles are provisioned by the administrator.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required', maxLength: 80 })}
        />
        <Input
          label="Official e-mail"
          type="email"
          error={errors.email?.message}
          {...register('email', { required: 'E-mail is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid e-mail' } })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="State"
            placeholder="e.g. Maharashtra"
            {...register('state')}
          />
          <Input
            label="District"
            placeholder="e.g. Pune"
            {...register('district')}
          />
        </div>
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', { required: true, minLength: { value: 8, message: 'Min 8 characters' } })}
        />
        <Input
          label="Confirm password"
          type="password"
          error={errors.confirm?.message}
          {...register('confirm', {
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />
        {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{serverError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
        <p className="text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-400">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
