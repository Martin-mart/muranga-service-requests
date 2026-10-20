import '../styles/pages/landing.css';
import '../styles/components/card.css';
import { ButtonLink } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCategories } from '../hooks/useReferenceData';
import { categoryIcon } from '../utils/status';

const STEPS = [
  {
    icon: 'bx-edit',
    title: 'Report',
    text: 'Describe the problem, choose your sub-county and add a photo or your location.',
  },
  {
    icon: 'bx-search-alt',
    title: 'Review',
    text: 'A county officer reviews it and starts work. You get an update in the app.',
  },
  {
    icon: 'bx-check-shield',
    title: 'Resolved',
    text: 'Follow every step on a timeline until the issue is fixed.',
  },
];

export default function LandingPage() {
  useDocumentTitle('');
  const { status, user } = useAuth();
  const categories = useCategories();
  const signedIn = status === 'authenticated';

  return (
    <div className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <span className="hero__eyebrow">
          <Icon name="bx-buildings" />
          County Government of Murang&rsquo;a
        </span>
        <h1 className="hero__title" id="hero-title">
          Report a public service problem. Track it until it is fixed.
        </h1>
        <p className="hero__text">
          Broken streetlights, water supply, garbage collection, roads and more: tell the county in
          under two minutes.
        </p>
        <div className="hero__actions">
          {signedIn ? (
            <ButtonLink
              to={user?.role === 'admin' ? '/admin' : '/requests/new'}
              size="lg"
              icon="bx-right-arrow-alt"
            >
              {user?.role === 'admin' ? 'Open dashboard' : 'Report an issue'}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/register" size="lg" icon="bx-user-plus">
                Create an account
              </ButtonLink>
              <ButtonLink to="/login" size="lg" variant="secondary">
                Sign in
              </ButtonLink>
              <ButtonLink to="/guest" size="lg" variant="ghost" icon="bx-user">
                Report without an account
              </ButtonLink>
            </>
          )}
        </div>
      </section>

      <section className="landing__section" aria-labelledby="how-title">
        <h2 className="landing__heading" id="how-title">
          How it works
        </h2>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.title} className="card steps__item">
              <Icon name={step.icon} className="steps__icon" />
              <h3 className="steps__title">{step.title}</h3>
              <p className="steps__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing__section" aria-labelledby="categories-title">
        <h2 className="landing__heading" id="categories-title">
          What you can report
        </h2>
        {categories.isPending ? (
          <div className="skeleton-stack" role="status" aria-label="Loading categories">
            <Skeleton variant="text" />
            <Skeleton variant="short" />
          </div>
        ) : categories.isError ? (
          <p className="field__hint">Categories are unavailable right now.</p>
        ) : (
          <ul className="category-grid">
            {categories.data.map((category) => (
              <li key={category.id} className="card category-grid__item">
                <Icon name={categoryIcon(category.slug)} className="category-grid__icon" />
                {category.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
