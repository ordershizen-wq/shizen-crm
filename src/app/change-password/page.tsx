import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { changeMyPassword } from '@/app/actions';
import ChangePasswordClient from './ChangePasswordClient';

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <ChangePasswordClient
      userName={user.fullName}
      action={changeMyPassword}
    />
  );
}
