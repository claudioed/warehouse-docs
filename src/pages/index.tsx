import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

interface ContextCard {
  slug: string;
  name: string;
  tier: 'Core' | 'Supporting' | 'Generic';
}

const CONTEXTS: ContextCard[] = [
  {slug: 'order-management', name: 'order-management', tier: 'Supporting'},
  {slug: 'inventory-storage', name: 'inventory-storage', tier: 'Core'},
  {slug: 'wes-work-planning', name: 'wes-work-planning', tier: 'Core'},
  {slug: 'fulfillment-execution', name: 'fulfillment-execution', tier: 'Core'},
  {slug: 'workforce-management', name: 'workforce-management', tier: 'Supporting'},
  {slug: 'facility-layout', name: 'facility-layout', tier: 'Generic'},
  {slug: 'process-path-management', name: 'process-path-management', tier: 'Generic'},
  {slug: 'labor-performance', name: 'labor-performance', tier: 'Supporting'},
  {slug: 'warehouse-ops-agent', name: 'warehouse-ops-agent', tier: 'Supporting'},
];

const TIER_CLASS: Record<ContextCard['tier'], string> = {
  Core: 'badge-core',
  Supporting: 'badge-supporting',
  Generic: 'badge-generic',
};

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.hero)}>
      <div className="container">
        <p className={styles.eyebrow}>warehouse-systems · fleet documentation</p>
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <p className={styles.heroLead}>
          Nine independently deployable bounded contexts, one shared
          ubiquitous language, and a single documented context map. This
          site is generated directly from each context's own OpenAPI and
          AsyncAPI specifications, ADRs, and domain source — never
          hand-transcribed.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/overview">
            Read the docs
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/strategic-design/context-map">
            Context Map
          </Link>
          <Link className="button button--secondary button--lg" to="/api-reference">
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function ContextGrid() {
  return (
    <section className="container">
      <Heading as="h2">The nine bounded contexts</Heading>
      <div className={styles.contextGrid}>
        {CONTEXTS.map((ctx) => (
          <Link key={ctx.slug} className={styles.contextCard} to={`/contexts/${ctx.slug}`}>
            <div className={styles.contextName}>{ctx.name}</div>
            <span className={TIER_CLASS[ctx.tier]}>{ctx.tier}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Fleet-wide documentation for the warehouse-systems ecosystem: strategic and tactical DDD artifacts, REST and AsyncAPI references, and business context for every bounded context.">
      <HomepageHeader />
      <main>
        <ContextGrid />
      </main>
    </Layout>
  );
}
