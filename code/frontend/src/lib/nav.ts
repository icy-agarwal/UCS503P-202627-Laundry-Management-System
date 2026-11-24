import type { Role } from '../api/types';
export const homeFor = (r: Role) => (r === 'student' ? '/student/home' : r === 'staff' ? '/staff/home' : '/admin/dashboard');
