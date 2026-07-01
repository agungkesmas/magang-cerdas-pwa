import { redirect } from 'next/navigation';

export default function HomePage() {
  // Landing page redirects to admin login by default
  redirect('/admin/login');
}
