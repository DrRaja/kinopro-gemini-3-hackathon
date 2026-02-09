import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clapperboard, Lock, Shield, Sparkles, User, Wand2 } from 'lucide-react';
import logoFull from '../assets/kino-logo-green.png';

interface AuthPageProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
  onSwitch: () => void;
}

const authHighlights = [
  {
    title: 'Studio-grade security',
    copy: 'Private workspaces, audit trails, and permissioned rooms.',
    icon: Shield,
  },
  {
    title: 'AI storyboarding',
    copy: 'Generate five cuts with cinematic pacing and control.',
    icon: Sparkles,
  },
  {
    title: 'Sound + poster lab',
    copy: 'Balance dubbing and poster options in one flow.',
    icon: Wand2,
  },
];

export function AuthPage({ mode, onBack, onSubmit, onSwitch }: AuthPageProps) {
  const [username, setUsername] = useState('demouser');
  const [password, setPassword] = useState('demouser');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="spectacle-page">
      <div className="spectacle-bg">
        <div className="spectacle-orb orb-one" />
        <div className="spectacle-orb orb-two" />
        <div className="spectacle-orb orb-three" />
        <div className="spectacle-gridlines" />
      </div>

      <div className="auth-shell">
        <div className="auth-brand">
          <img src={logoFull} alt="KinoPro" />
        </div>
        <button onClick={onBack} className="auth-back">
          <ArrowLeft className="w-5 h-5" />
          Back to landing
        </button>

        <div className="auth-grid">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="auth-panel glass-panel"
          >
            <div className="auth-panel-header">
              <div>
                <p className="auth-kicker">KinoPro Access</p>
                <h1>
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="auth-subtitle">Use demouser / demouser for quick access.</p>
              </div>
            </div>

            <div className="auth-highlight-list">
              {authHighlights.map((highlight) => {
                const Icon = highlight.icon;
                return (
                  <div key={highlight.title} className="glass-card auth-highlight">
                    <div className="auth-highlight-icon">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="auth-highlight-title">{highlight.title}</p>
                      <p className="auth-highlight-copy">{highlight.copy}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="auth-panel-footer">
              <Clapperboard className="w-5 h-5" />
              Secure rooms for cinematic teams.
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="auth-card glass-panel"
          >
            <div className="auth-form-header">
              <h2>{mode === 'login' ? 'Sign in to continue' : 'Start creating now'}</h2>
              <p>Step into your cinematic workspace in seconds.</p>
            </div>

            <div className="auth-fields">
              <label className="auth-label">
                Username
                <span className="auth-input">
                  <User className="w-4 h-4" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input-field"
                  />
                </span>
              </label>

              <label className="auth-label">
                Password
                <span className="auth-input">
                  <Lock className="w-4 h-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input-field"
                  />
                </span>
              </label>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button onClick={handleSubmit} disabled={isSubmitting} className="auth-submit">
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            <button onClick={onSwitch} className="auth-switch">
              {mode === 'login'
                ? 'Need an account? Create one'
                : 'Already have an account? Sign in'}
            </button>
          </motion.div>
        </div>

        <footer className="spectacle-footer glass-panel">
          <div>
            <p className="spectacle-footer-title">KinoPro Studio</p>
            <p className="spectacle-footer-copy">Story to screen. Instant. Intelligent.</p>
          </div>
          <p className="spectacle-footer-copy spectacle-footer-rights">
            © {new Date().getFullYear()} KinoPro. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
