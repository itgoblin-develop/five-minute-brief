import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { userAPI } from '@/lib/api';

interface EditProfileProps {
  onUpdate: () => void;
  onWithdraw: () => void;
}

export function EditProfile({ onUpdate, onWithdraw }: EditProfileProps) {
  const { user, refreshUser, logout } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPasswordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPasswordMismatch) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password && !currentPassword) {
      toast.error('현재 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: Record<string, string> = {};
      if (nickname !== user?.nickname) updateData.nickname = nickname;
      if (password) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = password;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('변경된 내용이 없습니다.');
        return;
      }

      const result = await userAPI.updateProfile(updateData);
      if (result.success) {
        toast.success('프로필이 수정되었습니다.');
        await refreshUser();
        onUpdate();
      } else {
        toast.error(result.error || '수정에 실패했습니다.');
      }
    } catch {
      toast.error('오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawClick = () => {
    Swal.fire({
      title: '회원탈퇴 하시겠습니까?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '예',
      cancelButtonText: '아니오'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await userAPI.deleteAccount();
          await logout();
          onWithdraw();
        } catch {
          toast.error('탈퇴 처리 중 오류가 발생했습니다.');
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 px-5 py-6 overflow-y-auto pb-24">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">

        {/* ID - Disabled */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">아이디</label>
           <input
             type="text"
             value={user?.email || ''}
             disabled
             className="w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 font-medium"
           />
        </div>

        {/* Nickname */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">닉네임</label>
           <input
             type="text"
             value={nickname}
             onChange={(e) => setNickname(e.target.value)}
             className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
           />
        </div>

        {/* Current Password */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">현재 비밀번호</label>
           <div className="relative">
             <input
               type={showCurrentPassword ? "text" : "password"}
               value={currentPassword}
               onChange={(e) => setCurrentPassword(e.target.value)}
               placeholder="비밀번호 변경 시 입력"
               className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
             />
             <button
               type="button"
               onClick={() => setShowCurrentPassword(!showCurrentPassword)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
             >
               {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">새 비밀번호</label>
           <div className="relative">
             <input
               type={showPassword ? "text" : "password"}
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="변경할 비밀번호 입력"
               className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
             />
             <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
             >
               {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
        </div>

        {/* Password Confirm */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">비밀번호 재입력</label>
           <div className="relative">
             <input
               type={showPasswordConfirm ? "text" : "password"}
               value={passwordConfirm}
               onChange={(e) => setPasswordConfirm(e.target.value)}
               placeholder="비밀번호를 다시 입력해주세요"
               className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border rounded-2xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all ${
                   isPasswordMismatch
                   ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                   : 'border-gray-100 dark:border-gray-700 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
               }`}
             />
             <button
               type="button"
               onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
             >
               {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
           {isPasswordMismatch && (
                <p className="text-red-500 text-xs mt-1 ml-1">비밀번호가 일치하지 않습니다.</p>
           )}
           {!isPasswordMismatch && (
             <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 ml-1">영문, 숫자, 특수문자 포함 8자 이상 입력해주세요.</p>
           )}
        </div>

        <div className="flex-1 min-h-[40px]" />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {isSubmitting ? '처리 중...' : '수정하기'}
        </button>

        {/* Withdrawal Link */}
        <div className="mt-4 flex justify-center pb-4">
            <button
              type="button"
              onClick={handleWithdrawClick}
              className="text-red-500 text-sm font-medium underline underline-offset-4 hover:text-red-600"
            >
              회원탈퇴
            </button>
        </div>

      </form>
    </div>
  );
}
