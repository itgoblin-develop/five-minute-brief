import { useState } from 'react';
import { SignupPage } from './pages/Signup';
import { LoginPage } from './pages/Login';
import './App.css';

function App() {
  const [page, setPage] = useState<'login' | 'signup'>('login');

  if (page === 'signup') {
    return <SignupPage onGoLogin={() => setPage('login')} />;
  }

  return <LoginPage onGoSignup={() => setPage('signup')} />;
}

export default App;
