import { useState } from 'react';
import './App.css';
import { authAPI, userAPI } from './lib/api';

function App() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // API 테스트 함수들
  const testSignup = async () => {
    setLoading(true);
    setResult('회원가입 테스트 중...');
    try {
      const timestamp = Date.now();
      console.log('회원가입 요청 시작:', { timestamp });
      
      const data = await authAPI.signup(
        `test${timestamp}@frontend.com`, // 중복 방지를 위해 타임스탬프 추가
        `프론트테스트${timestamp}`, // 닉네임도 타임스탬프 추가
        'test1234'
      );
      
      console.log('회원가입 응답:', data);
      
      if (data) {
        setResult(JSON.stringify(data, null, 2));
      } else {
        setResult('응답 데이터가 없습니다.');
      }
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      console.error('에러 상세:', {
        response: error.response,
        message: error.message,
        data: error.response?.data
      });
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류';
      setResult(`에러: ${errorMessage}\n\n상세 정보:\n${JSON.stringify(error.response?.data || error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('로그인 테스트 중...\n\n⚠️ 참고: 먼저 "회원가입 테스트"를 실행한 후, 같은 이메일/비밀번호로 로그인하세요.');
    try {
      // 최근에 회원가입한 계정 찾기 (타임스탬프 기반)
      // 실제로는 회원가입 후 저장된 이메일을 사용해야 하지만, 테스트용으로 하드코딩
      // 사용자가 직접 입력할 수 있는 폼은 Phase 8에서 구현 예정
      const testEmail = 'test@example2.com'; // 기존에 가입한 계정
      const testPassword = 'test1234';
      
      console.log('로그인 시도:', { email: testEmail });
      const data = await authAPI.login(testEmail, testPassword);
      console.log('로그인 성공:', data);
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('로그인 에러:', error);
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류';
      
      // 401 에러는 정상적인 동작 (존재하지 않는 계정이거나 잘못된 비밀번호)
      if (error.response?.status === 401) {
        setResult(`❌ 로그인 실패 (401 Unauthorized)\n\n에러: ${errorMessage}\n\n💡 해결 방법:\n1. 먼저 "회원가입 테스트"를 실행하세요\n2. 또는 기존 계정의 이메일/비밀번호를 확인하세요\n3. Phase 8에서 실제 입력 폼으로 테스트할 수 있습니다`);
      } else {
        setResult(`에러: ${errorMessage}\n\n상세 정보:\n${JSON.stringify(error.response?.data || error, null, 2)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const testProfile = async () => {
    setLoading(true);
    setResult('프로필 조회 테스트 중...');
    try {
      const data = await userAPI.getProfile();
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('API 에러:', error);
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류';
      setResult(`에러: ${errorMessage}\n\n상세 정보:\n${JSON.stringify(error.response?.data || error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testMe = async () => {
    setLoading(true);
    setResult('내 정보 조회 테스트 중...');
    try {
      const data = await userAPI.getMe();
      setResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('API 에러:', error);
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류';
      setResult(`에러: ${errorMessage}\n\n상세 정보:\n${JSON.stringify(error.response?.data || error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>오늘5분 - 프론트엔드 API 테스트</h1>
      <p>백엔드 API 연동 테스트 페이지입니다.</p>

      <div className="button-group">
        <button onClick={testSignup} disabled={loading}>
          회원가입 테스트
        </button>
        <button onClick={testLogin} disabled={loading}>
          로그인 테스트
        </button>
        <button onClick={testProfile} disabled={loading}>
          프로필 조회 (DB)
        </button>
        <button onClick={testMe} disabled={loading}>
          내 정보 조회 (토큰)
        </button>
      </div>

      <div className="result">
        <h3>결과:</h3>
        {result ? (
          <pre>{result}</pre>
        ) : (
          <pre style={{ color: '#999' }}>결과가 여기에 표시됩니다...</pre>
        )}
      </div>

      <div className="info">
        <h3>📋 테스트 순서</h3>
        <ol>
          <li>회원가입 테스트: 새 계정 생성</li>
          <li>로그인 테스트: 로그인 후 토큰 저장</li>
          <li>프로필 조회: DB에서 사용자 정보 조회</li>
          <li>내 정보 조회: 토큰에서 사용자 정보 조회</li>
        </ol>
        <p>
          <strong>참고:</strong> 로그인 후에만 프로필 조회가 가능합니다.
        </p>
      </div>
    </div>
  );
}

export default App;
