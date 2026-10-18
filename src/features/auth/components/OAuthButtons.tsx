import type { ReactNode } from 'react';
import { FiGithub } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuthStore, type OAuthProvider } from '@/stores/useAuthStore';

/**
 * 第三方 OAuth 快捷登录（Google / GitHub）。
 * 按钮触发 useAuthStore.signInWithOAuth，成功后浏览器跳转第三方授权页，
 * 回跳时由 supabase-js 的 detectSessionInUrl 自动建立会话。
 */
export default function OAuthButtons() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);

  const providers: Array<{ id: OAuthProvider; name: string; icon: ReactNode }> = [
    { id: 'google', name: 'Google', icon: <FcGoogle className="size-4" /> },
    { id: 'github', name: 'GitHub', icon: <FiGithub className="size-4" /> },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={isLoading}
            onClick={() => {
              void signInWithOAuth(provider.id);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/[0.05] cream:bg-white/60 hover:bg-white/95 dark:hover:bg-white/[0.1] text-xs font-medium text-gray-700 dark:text-gray-200 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {provider.icon}
            <span>使用 {provider.name} 登录</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/10" />
        <span className="text-[11px] text-gray-400 dark:text-gray-500">或使用邮箱继续</span>
        <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/10" />
      </div>
    </div>
  );
}
