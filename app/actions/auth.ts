'use server';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/rbac';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/db/audit';

export async function changePasswordAction(newPassword: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Kata sandi minimal 6 karakter.' };
    }

    // 1. Update in Supabase Auth
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (authError) {
      // Fallback with regular client session
      const supabase = await createClient();
      const { error: userAuthError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (userAuthError) {
        return { success: false, error: userAuthError.message || 'Gagal mengubah kata sandi di sistem otentikasi.' };
      }
    }

    // 2. Set mustChangePassword = false in users table
    await db
      .update(users)
      .set({
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // 3. Log audit
    await logAudit({
      userId: user.id,
      userName: user.nama,
      action: 'USER_CHANGE_PASSWORD',
      entity: 'users',
      entityId: user.id,
      details: { email: user.email },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem saat mengubah kata sandi.' };
  }
}

export async function checkUserMustChangePasswordAction(email: string): Promise<boolean> {
  try {
    const [u] = await db
      .select({ mustChangePassword: users.mustChangePassword })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return Boolean(u?.mustChangePassword);
  } catch (e) {
    return false;
  }
}

