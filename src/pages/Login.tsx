import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setIsLoading(true)
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'auth/user-not-found') setError('No account found')
      else if (e.code === 'auth/wrong-password') setError('Incorrect password')
      else if (e.code === 'auth/invalid-credential') setError('Invalid email or password')
      else if (e.code === 'auth/email-already-in-use') setError('Email already in use')
      else if (e.code === 'auth/weak-password') setError('Password too weak')
      else if (e.code === 'auth/invalid-email') setError('Invalid email format')
      else if (e.code === 'auth/too-many-requests') setError('Too many attempts, try later')
      else setError(e.message || e.code || 'An error occurred')
    } finally { setIsLoading(false) }
  }

  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    setIsLoading(true)
    try {
      await signInWithPopup(auth, provider)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider)
        return
      }
      if (e.code === 'auth/unauthorized-domain') {
        setError('This site domain is not authorized in Firebase Auth. Add your GitHub Pages domain in Firebase Authentication -> Settings -> Authorized domains.')
      } else if (e.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled for this Firebase project.')
      } else {
        setError(e.message || e.code || 'Google sign-in failed')
      }
    }
    finally { setIsLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-bg"><div className="gradient-orb login-orb"></div></div>
      <button className="back-btn" onClick={() => navigate('/')}><ArrowLeft size={18} /><span>Back</span></button>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo"><span>CU</span></div>
            <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <p>{isSignUp ? 'Sign up to get started' : 'Sign in to your account'}</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input type="email" placeholder="your.email@carleton.ca" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary btn-login" disabled={isLoading}>
              {isLoading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <div className="divider"><span>or continue with</span></div>
          <div className="social-login">
            <button className="social-btn google" onClick={handleGoogle} disabled={isLoading}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google</span>
            </button>
          </div>
          <p className="signup-link">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="link-btn" onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
