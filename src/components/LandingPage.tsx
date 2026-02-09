import { motion } from 'motion/react';
import {
  ArrowRight,
  Clapperboard,
  Film,
  Layers,
  Play,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import logoFull from '../assets/kino-logo-green.png';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const showcaseCards = [
  { title: 'AI-powered Storyboards', detail: 'Your Vision, Every Arc, AI-Powered.', icon: Clapperboard },
  { title: 'Poster Lab', detail: 'Blockbuster Posters. Born from Your Footage.', icon: Film },
  { title: 'Voice Pass', detail: 'Voices That Fit. Every Time.', icon: Play },
];

const featureCards = [
  {
    title: 'Arc Intelligence',
    copy: 'Map emotional beats, tone shifts, and pacing in minutes.',
    icon: Sparkles,
  },
  {
    title: 'Scene Control',
    copy: 'Reorder, trim, and remix sequences with timeline clarity.',
    icon: Layers,
  },
  {
    title: 'Glass Storyboards',
    copy: 'Hover any frame to preview with a cinematic gloss.',
    icon: Wand2,
  },
  {
    title: 'Studio Exports',
    copy: 'Deliver EDL, XML, and shareable previews fast.',
    icon: Film,
  },
  {
    title: 'Secure Rooms',
    copy: 'Private workspaces with audit-ready permissions.',
    icon: Shield,
  },
  {
    title: 'Live Playback',
    copy: 'Instant playbacks without breaking your flow.',
    icon: Play,
  },
];

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="spectacle-page">
      <div className="spectacle-bg">
        <div className="spectacle-orb orb-one" />
        <div className="spectacle-orb orb-two" />
        <div className="spectacle-orb orb-three" />
        <div className="spectacle-gridlines" />
      </div>

      <div className="spectacle-shell">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="spectacle-brand"
        >
          <img
            src={logoFull}
            alt="KinoPro"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </motion.div>

        <div className="spectacle-hero-grid">
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="spectacle-hero-copy"
          >
            {/* <div className="spectacle-chip">
              <Sparkles className="w-4 h-4 text-emerald-200" />
              Gemini-powered cinematic workflows
            </div> */}

            <h1 className="spectacle-title">
              Your cinematic control room for storyboards, posters, and sound.
              <span className="spectacle-title-accent">
                Visualize your entire film—from concept to final cut.
              </span>
            </h1>
            <p className="spectacle-subtitle">
              KinoPro combines AI-powered scene intelligence with realtime playback so you can iterate
              faster than a trailer edit, without losing the mood.
            </p>

            <div className="spectacle-actions">
              <button onClick={onRegister} className="spectacle-primary">
                <span className="flex items-center gap-2">
                  Start a project
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
              <button onClick={onLogin} className="spectacle-secondary">
                Login
              </button>
            </div>

            <div className="spectacle-metrics">
              <div className="glass-card metric-card">
                <p className="metric-value">5</p>
                <p className="metric-label">Trailer cuts</p>
              </div>
              <div className="glass-card metric-card">
                <p className="metric-value">100+</p>
                <p className="metric-label">Scenes mapped</p>
              </div>
              <div className="glass-card metric-card">
                <p className="metric-value">EDL/XML</p>
                <p className="metric-label">Studio exports</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="spectacle-showcase glass-panel"
          >
            <div className="showcase-header">
              <div>
                <p className="showcase-title">Cinematic PowerPack</p>
                <p className="showcase-kicker">Unleash Hollywood-level creation in one toolkit</p>
              </div>
              {/* <span className="showcase-status">Generating</span> */}
            </div>

            <div className="showcase-cards">
              {showcaseCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="glass-card showcase-card">
                    <div className="showcase-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="showcase-card-title">{card.title}</p>
                      <p className="showcase-card-detail">{card.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* <div className="showcase-footer">
              <div className="showcase-wave" />
              <p>Hover a frame for instant playback.</p>
            </div> */}
          </motion.div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="spectacle-feature-section"
        >
          <div className="feature-header">
            <div>
              <p className="feature-kicker">Studio-grade toolkit</p>
              <h2>Everything you need to build cinematic worlds.</h2>
            </div>
            {/* <p className="feature-copy">
              Glassmorph surfaces, orchestral pacing, and AI that stays out of the way until you
              need it.
            </p> */}
          </div>
          <div className="feature-grid">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="glass-card feature-card">
                  <div className="feature-icon">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        <footer className="spectacle-footer glass-panel">
          <div>
            <p className="spectacle-footer-title">KinoPro Studio</p>
            <p className="spectacle-footer-copy">
              Story to screen. Instant. Intelligent.
            </p>
          </div>
          {/* <div className="spectacle-footer-links">
            <button type="button" onClick={onRegister} className="spectacle-footer-link">
              Start a project
            </button>
            <button type="button" onClick={onLogin} className="spectacle-footer-link">
              Demo access
            </button>
          </div> */}
          <p className="spectacle-footer-copy spectacle-footer-rights">
            © {new Date().getFullYear()} KinoPro. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
