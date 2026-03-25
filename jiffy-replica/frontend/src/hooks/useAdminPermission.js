import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

/**
 * Permission keys correspond to admin_permissions JSONB fields:
 * revenue, services, categories, pro_applications, profile_updates,
 * invitations, payouts, quotations, quote_assignments, quote_requests,
 * proofs, support_chat, disputes
 *
 * Pass null or omit permissionKey to require admin role only (no specific permission needed).
 * SuperAdmin (is_superadmin=true) always passes regardless of permissionKey.
 */
export function useAdminPermission(permissionKey) {
  const { profile, authInitialized } = useSelector((state) => state.auth);
  const router = useRouter();

  const hasAccess = () => {
    if (!profile || profile.role !== 'admin') return false;
    if (profile.is_superadmin) return true;
    if (!permissionKey) return true;
    if (!profile.admin_permissions) return false;
    return profile.admin_permissions[permissionKey] === true;
  };

  useEffect(() => {
    if (!authInitialized) return;
    if (!profile || profile.role !== 'admin') {
      router.push('/');
      return;
    }
    if (profile.is_superadmin) return;
    if (permissionKey) {
      if (!profile.admin_permissions || profile.admin_permissions[permissionKey] !== true) {
        toast.error('You do not have permission to access this page.');
        router.push('/admin/revenue');
      }
    }
  }, [authInitialized, profile, router, permissionKey]);

  return hasAccess();
}
