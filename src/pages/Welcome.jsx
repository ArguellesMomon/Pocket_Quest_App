import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context';
import { createGame } from '../../shared/game';
import { Brand } from '../Application';
import { HabitatArt } from '../components/PixelArt';
import Icon from '../components/Icon';
import { auth, cloudConfigured } from '../lib/cloud';
import WelcomeStart from '../components/WelcomeStart';
export function Welcome() {
  return <WelcomeStart />;
}
export function Account({ recovery = false, reset = false }) {
  const { restore, toast, state, user } = useGame();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(''),
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
      if (!auth)
        throw new Error('Cloud accounts are not configured yet. You can start a guest adventure.');
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
        const session = await auth.getSession();
        if (!session.data?.user && signup) {
          setVerify(true);
          check(await auth.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
        } else if (!session.data?.user)
          throw new Error('Please verify your email before signing in.');
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
    <div className="account-page">
      <Link className="account-brand brand-link" to="/">
        <Brand />
      </Link>
      <main id="main-content" className="account-layout">
        <aside className="account-story">
          <span className="pixel-label">YOUR PROGRESS, WHEREVER YOU GO</span>
          <h1>
            Your little world.
            <br />
            <span>Always with you.</span>
          </h1>
          <HabitatArt state={state || createGame()} />
          <p>
            Small quests. A growing companion.
            <br />A little more joy in your everyday.
          </p>
        </aside>
        <section className="account-card panel">
          <Link to={state ? '/dashboard' : '/'} className="text-link">
            <Icon name="back" size={16} />
            Back to your world
          </Link>
          <span className="eyebrow">
            {verify
              ? 'ONE LITTLE CHECK'
              : recovery || reset
                ? 'FIND YOUR WAY BACK'
                : signup
                  ? 'START A CLOUD ADVENTURE'
                  : 'WELCOME BACK, ADVENTURER'}
          </span>
          <h2>
            {verify
              ? 'Check your inbox.'
              : reset
                ? 'A fresh password.'
                : recovery
                  ? 'Let’s get you back in.'
                  : signup
                    ? 'Make yourself at home.'
                    : 'Your world is waiting.'}
          </h2>
          <p>
            {verify
              ? `Enter the verification code sent to ${email}.`
              : recovery
                ? 'We’ll email you a link to reset your password.'
                : reset
                  ? 'Choose a new password for your adventure.'
                  : 'Sign in to save your cloud adventure across devices.'}
          </p>
          {!cloudConfigured && (
            <div className="inline-warning">
              Cloud accounts are not connected. Guest mode is fully playable.
            </div>
          )}
          {user && !recovery && !reset ? (
            <>
              <p>You’re signed in as {user.email}.</p>
              <Link className="button primary full-width" to="/dashboard">
                Continue adventure
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
                <div className="tabs account-tabs">
                  <button
                    type="button"
                    className={!signup ? 'active' : ''}
                    onClick={() => {
                      setSignup(false);
                      setError('');
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={signup ? 'active' : ''}
                    onClick={() => {
                      setSignup(true);
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
                    placeholder="What should we call you?"
                    autoComplete="name"
                  />
                </label>
              )}
              {!reset && !verify && (
                <label>
                  Email address
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
              )}
              {!recovery && !verify && (
                <label>
                  Password
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={signup || reset ? 'new-password' : 'current-password'}
                  />
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
                  Forgot your password?
                </Link>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary full-width" disabled={busy || !cloudConfigured}>
                {busy
                  ? 'Just a moment…'
                  : verify
                    ? 'Verify & continue'
                    : recovery
                      ? 'Send recovery link'
                      : reset
                        ? 'Save new password'
                        : signup
                          ? 'Create my adventure'
                          : 'Continue adventure'}
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
                  Send a fresh code
                </button>
              )}
            </form>
          )}
          {!recovery && !reset && (
            <p className="account-guest-note">
              Guest and cloud adventures are separate. <Link to="/">Play as a guest</Link>—no
              account needed.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
