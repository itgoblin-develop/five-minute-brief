import { useState } from 'react';
import '../App.css';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card } from '../components/ui/card';
import { authAPI } from '../lib/api';

type SignupPageProps = {
  onGoLogin?: () => void;
};

export function SignupPage({ onGoLogin }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [over14, setOver14] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordConfirmError, setPasswordConfirmError] = useState<string | null>(
    null,
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]{8,16}$/;

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

  const validatePassword = () => {
    if (!password) {
      setPasswordError(null);
      return;
    }
    if (!passwordRegex.test(password)) {
      setPasswordError('비밀번호는 8~16자, 영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함해야 합니다.');
    } else {
      setPasswordError(null);
    }

    // 비밀번호를 수정했을 때, 확인 값도 다시 검증
    if (passwordConfirm) {
      if (password !== passwordConfirm) {
        setPasswordConfirmError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      } else {
        setPasswordConfirmError(null);
      }
    }
  };

  const validatePasswordConfirm = () => {
    if (!passwordConfirm) {
      setPasswordConfirmError(null);
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordConfirmError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    } else {
      setPasswordConfirmError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 필드별 에러 리셋
    setEmailError(null);
    setPasswordError(null);
    setPasswordConfirmError(null);

    if (!email || !password || !passwordConfirm || !nickname) {
      setMessage('모든 필드를 입력해주세요.');
      return;
    }

    let hasError = false;

    if (!emailRegex.test(email)) {
      setEmailError('이메일 주소 형식에 맞게 입력해 주세요.');
      hasError = true;
    }

    if (!passwordRegex.test(password)) {
      setPasswordError('비밀번호는 8~16자, 영문, 숫자, 특수문자(@$!%*#?&)를 모두 포함해야 합니다.');
      hasError = true;
    }

    if (password !== passwordConfirm) {
      setPasswordConfirmError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (!over14 || !terms || !privacy) {
      setMessage('필수 약관에 모두 동의해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const data = await authAPI.signup(email, nickname, password);
      if (data?.success) {
        setMessage('✅ 회원가입이 완료되었습니다. 자동 로그인 상태가 됩니다.');
      } else {
        setMessage(data?.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error.message || '회원가입 중 오류가 발생했습니다.';
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

        <form className="signup-form" onSubmit={handleSubmit}>
          {/* 아이디 (이메일) */}
          <div className="signup-field">
            <Label htmlFor="email">아이디</Label>
            <Input
              id="email"
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
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="8~16자리 영문+숫자+특수문자 조합"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) {
                  // 사용자가 수정 중이면 실시간으로 에러 해제 시도
                  if (e.target.value.length >= 8) {
                    setPasswordError(null);
                  }
                }
              }}
              onBlur={validatePassword}
            />
            {passwordError && (
              <div className="signup-error-text">{passwordError}</div>
            )}
          </div>

          {/* 비밀번호 재확인 */}
          <div className="signup-field">
            <Label htmlFor="passwordConfirm">비밀번호 재확인</Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력해주세요"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                if (passwordConfirmError) {
                  if (password === e.target.value) {
                    setPasswordConfirmError(null);
                  }
                }
              }}
              onBlur={validatePasswordConfirm}
            />
            {passwordConfirmError && (
              <div className="signup-error-text">{passwordConfirmError}</div>
            )}
          </div>

          {/* 닉네임 */}
          <div className="signup-field">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="2~20자 닉네임을 입력해주세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          {/* 체크박스 영역 */}
          <div className="signup-checkbox-group">
            <label className="signup-checkbox-row">
              <Checkbox
                checked={over14}
                onCheckedChange={(v) => setOver14(!!v)}
              />
              <span>만 14세 이상입니다.</span>
            </label>
            <label className="signup-checkbox-row">
              <Checkbox
                checked={terms}
                onCheckedChange={(v) => setTerms(!!v)}
              />
              <span>서비스 이용약관 동의</span>
              <button type="button" className="signup-link-button">
                약관보기
              </button>
            </label>
            <label className="signup-checkbox-row">
              <Checkbox
                checked={privacy}
                onCheckedChange={(v) => setPrivacy(!!v)}
              />
              <span>개인정보수집방침 동의</span>
              <button type="button" className="signup-link-button">
                약관보기
              </button>
            </label>
          </div>

          {/* 상태 메시지 */}
          {message && <div className="signup-message">{message}</div>}

          {/* 회원가입 버튼 */}
          <Button
            type="submit"
            disabled={submitting}
            className="signup-submit-button"
          >
            {submitting ? '처리 중...' : '회원가입'}
          </Button>

          {/* 로그인 링크 */}
          <p className="signup-footer-text">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              className="signup-login-link"
              onClick={onGoLogin}
            >
              로그인
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
}

