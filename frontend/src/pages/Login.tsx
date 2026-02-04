import { useState } from 'react';
import '../App.css';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { authAPI } from '../lib/api';

type LoginPageProps = {
  onGoSignup?: () => void;
};

export function LoginPage({ onGoSignup }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = () => {
    if (!email) {
      setEmailError(null);
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError('이메일 주소 형식에 맞게 입력해 주세요.');
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setEmailError(null);

    if (!email || !password) {
      setMessage('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (!emailRegex.test(email)) {
      setEmailError('이메일 주소 형식에 맞게 입력해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const data = await authAPI.login(email, password);
      if (data?.success) {
        setMessage('✅ 로그인에 성공했습니다.');
        // 추후: 메인 페이지로 이동 (예: onLoginSuccess 콜백 또는 라우터 사용)
      } else {
        setMessage(data?.error || '로그인 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error.message || '로그인 중 오류가 발생했습니다.';
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-root">
      <Card>
        <header className="signup-header">
          {/* 임시 텍스트 로고 - 실제 SVG 로고로 교체 예정 */}
          <div className="signup-logo">5늘5분</div>
        </header>

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          {/* 아이디 (이메일) */}
          <div className="signup-field">
            <Label htmlFor="login-email">아이디</Label>
            <Input
              id="login-email"
              type="text"
              placeholder="이메일 주소형식으로 입력해주세요"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) {
                  if (emailRegex.test(e.target.value)) {
                    setEmailError(null);
                  }
                }
              }}
              onBlur={validateEmail}
            />
            {emailError && (
              <div className="signup-error-text">{emailError}</div>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="signup-field">
            <Label htmlFor="login-password">비밀번호</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="8~16자리 영문+숫자 조합"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* 상태 메시지 */}
          {message && <div className="signup-message">{message}</div>}

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            disabled={submitting}
            className="signup-submit-button"
          >
            {submitting ? '로그인 중...' : '로그인'}
          </Button>

          {/* 회원가입 버튼 */}
          <Button
            type="button"
            variant="outline"
            className="login-secondary-button"
            onClick={onGoSignup}
          >
            회원가입
          </Button>

          {/* 비회원으로 이용하기 */}
          <p className="signup-footer-text login-guest-text">
            비회원으로 이용하기
          </p>
        </form>
      </Card>
    </div>
  );
}

