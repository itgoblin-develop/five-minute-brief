import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

interface EditProfileProps {
  onUpdate: () => void;
  onWithdraw: () => void;
}

export function EditProfile({ onUpdate, onWithdraw }: EditProfileProps) {
  const [id] = useState('user@example.com'); // Mock ID
  const [name, setName] = useState('OOO');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const isPasswordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPasswordMismatch) {
        toast.error('비밀번호가 일치하지 않습니다.');
        return;
    }
    // Logic to update profile would go here
    onUpdate();
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
    }).then((result) => {
      if (result.isConfirmed) {
        onWithdraw();
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white px-5 py-6 overflow-y-auto pb-24">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">
        
        {/* ID - Disabled */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900">아이디</label>
           <input 
             type="text" 
             value={id} 
             disabled 
             className="w-full px-4 py-3.5 bg-gray-100 border border-gray-100 rounded-2xl text-gray-500 font-medium"
           />
        </div>

        {/* Name */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900">이름</label>
           <input 
             type="text" 
             value={name} 
             onChange={(e) => setName(e.target.value)}
             className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
           />
        </div>

        {/* Password */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900">비밀번호</label>
           <div className="relative">
             <input 
               type={showPassword ? "text" : "password"} 
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="변경할 비밀번호 입력"
               className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1] transition-all"
             />
             <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
             >
               {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
        </div>

        {/* Password Confirm */}
        <div className="space-y-2">
           <label className="block text-sm font-bold text-gray-900">비밀번호 재입력</label>
           <div className="relative">
             <input 
               type={showPasswordConfirm ? "text" : "password"} 
               value={passwordConfirm}
               onChange={(e) => setPasswordConfirm(e.target.value)}
               placeholder="비밀번호를 다시 입력해주세요"
               className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                   isPasswordMismatch
                   ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                   : 'border-gray-100 focus:ring-[#3D61F1]/20 focus:border-[#3D61F1]'
               }`}
             />
             <button
               type="button"
               onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
               className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
             >
               {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
           </div>
           {isPasswordMismatch && (
                <p className="text-red-500 text-xs mt-1 ml-1">비밀번호가 일치하지 않습니다.</p>
           )}
           {!isPasswordMismatch && (
             <p className="text-gray-400 text-xs mt-1 ml-1">영문, 숫자 포함 8자 이상 입력해주세요.</p>
           )}
        </div>

        <div className="flex-1 min-h-[40px]" /> 

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-[#3D61F1] text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
        >
          수정하기
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
