import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../context';
import { createGame } from '../../shared/game';
import { Brand } from '../Application';
import { HabitatArt } from '../components/PixelArt';
import Icon from '../components/Icon';
import { auth, cloudConfigured } from '../lib/cloud';
import WelcomeStart from '../components/WelcomeStart';
import SpritePet from '../components/SpritePet';
export function Welcome() {
  return <WelcomeStart />;
}
export function Account({ recovery = false, reset = false }) {
  const { restore, toast, state, user } = useGame();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const signup = params.get('mode') === 'signup';
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false),
    [verify, setVerify] = useState(false),
    [code, setCode] = useState('');
  const check = (result) => {
    if (result.error) throw new Error(result.error.message || 'Please try again.');
    return result.data;
  };
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!auth) throw new Error('Sign-in is unavailable. Please try again later.');
      if (reset) {
        const token = new URLSearchParams(location.search).get('token');
        if (!token) throw new Error('Open the password reset link from your email first.');
        check(await auth.resetPassword({ token, newPassword: password }));
        setSent(true);
      } else if (recovery) {
        check(
          await auth.requestPasswordReset({
            email,
            redirectTo: `${location.origin}/reset-password`,
          }),
        );
        setSent(true);
      } else if (verify) {
        check(await auth.emailOtp.verifyEmail({ email, otp: code }));
        check(await auth.signIn.email({ email, password }));
        await restore();
        navigate('/dashboard');
      } else {
        const result = signup
          ? await auth.signUp.email({ email, password, name })
          : await auth.signIn.email({ email, password });
        check(result);
        const response = await fetch('/api/auth/get-session', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error('Could not open your account. Please try again.');
        const session = await response.json();
        if (!session?.user && signup) {
          setVerify(true);
          check(await auth.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
        } else if (!session?.user) throw new Error('Please verify your email before signing in.');
        else {
          await restore();
          navigate('/dashboard');
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`account-page fresh-account ${signup ? 'signup-account' : ''}`}>
      <Link className="account-brand brand-link" to="/">
        <Brand />
      </Link>
      <main id="main-content" className="account-layout">
        <aside className="account-story">
          <span className="welcome-kicker">
            <Icon name="sprout" size={15} /> A gentler daily rhythm
          </span>
          <h1>
            A little focus.
            <br />
            <span>A lot of heart.</span>
          </h1>
          <HabitatArt state={state || createGame()} />
          <p>Plan your day. Celebrate your progress.</p>
        </aside>
        <section className="account-card panel">
          <div className="account-greeting">
            <SpritePet species="cat" mood="happy" />
            <span>
              {signup ? 'Your little friend is ready.' : 'One small step. I’m with you.'}
              <Icon name="heart" size={13} />
            </span>
          </div>
          <h1>
            {verify
              ? 'Check your inbox.'
              : reset
                ? 'A fresh start.'
                : recovery
                  ? 'Let’s get you back.'
                  : signup
                    ? 'Make yourself at home.'
                    : 'Welcome back.'}
          </h1>
          <p>
            {verify
              ? `Enter the verification code sent to ${email}.`
              : recovery
                ? 'We’ll send a password reset link.'
                : reset
                  ? 'Choose a new password.'
                  : signup
                    ? 'A place for your tasks and tiny wins.'
                    : 'Your tasks. Your friend. Your little wins.'}
          </p>
          {!cloudConfigured && (
            <div className="inline-warning">Sign-in is unavailable. Please try again later.</div>
          )}
          {user && !recovery && !reset ? (
            <>
              <p>You’re signed in as {user.email}.</p>
              <Link className="button primary full-width" to="/dashboard">
                Open my day
                <Icon name="arrow" size={18} />
              </Link>
            </>
          ) : sent ? (
            <div className="account-success">
              <Icon name="check" size={30} />
              <h3>{reset ? 'You’re all set.' : 'Check your email.'}</h3>
              <p>
                {reset
                  ? 'Your password has been updated.'
                  : 'If an account exists for that address, a recovery link is on its way.'}
              </p>
              <Link to="/login" className="button primary">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              {!recovery && !reset && !verify && (
                <div className="tabs account-tabs" role="group" aria-label="Account mode">
                  <button
                    type="button"
                    className={!signup ? 'active' : ''}
                    aria-pressed={!signup}
                    disabled={busy}
                    onClick={() => {
                      setParams({}, { replace: true });
                      setShowPassword(false);
                      setError('');
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={signup ? 'active' : ''}
                    aria-pressed={signup}
                    disabled={busy}
                    onClick={() => {
                      setParams({ mode: 'signup' }, { replace: true });
                      setShowPassword(false);
                      setError('');
                    }}
                  >
                    Create account
                  </button>
                </div>
              )}
              {signup && !verify && !recovery && !reset && (
                <label>
                  Your name
                  <input
                    required
                    maxLength={30}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    autoComplete="name"
                  />
                </label>
              )}
              {!reset && !verify && (
                <label>
                  Email address
                  <span className="account-input">
                    <Icon name="mail" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </span>
                </label>
              )}
              {!recovery && !verify && (
                <label htmlFor="account-password">
                  Password
                  <span className="account-input password-input">
                    <Icon name="lock" size={18} />
                    <input
                      id="account-password"
                      aria-label="Password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={signup || reset ? 'At least 8 characters' : 'Your password'}
                      autoComplete={signup || reset ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className="password-reveal"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                    </button>
                  </span>
                </label>
              )}
              {verify && (
                <label>
                  Verification code
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Your email code"
                    maxLength={8}
                  />
                </label>
              )}
              {!signup && !recovery && !reset && !verify && (
                <Link to="/forgot-password" className="text-link forgot-link">
                  Forgot password?
                </Link>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="button primary full-width"
                disabled={busy || !cloudConfigured}
              >
                {busy
                  ? 'Opening your day…'
                  : verify
                    ? 'Verify & continue'
                    : recovery
                      ? 'Send recovery link'
                      : reset
                        ? 'Save new password'
                        : signup
                          ? 'Create account'
                          : 'Sign in'}
                <Icon name="arrow" size={17} />
              </button>
              {verify && (
                <button
                  className="text-link resend-code"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      check(
                        await auth.emailOtp.sendVerificationOtp({
                          email,
                          type: 'email-verification',
                        }),
                      );
                      toast('A fresh verification code is on its way.');
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Resend code
                </button>
              )}
            </form>
          )}
          {!recovery && !reset && (
            <span className="account-footer">
              <Icon name="cloud" size={13} /> Your progress, wherever you go.
            </span>
          )}
        </section>
      </main>
    </div>
  );
}
