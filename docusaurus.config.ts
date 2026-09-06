import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';

const config: Config = {
  title: 'warehouse-systems Documentation',
  tagline:
    'The single reference for every bounded context in the warehouse-systems ecosystem — strategic & tactical DDD artifacts, REST and async APIs, and business context.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
    faster: true,
  },

  url: 'https://claudioed.github.io',
  baseUrl: '/warehouse-docs/',

  organizationName: 'claudioed',
  projectName: 'warehouse-docs',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/claudioed/warehouse-docs/tree/main/',
          docItemComponent: '@theme/ApiItem',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          orderManagement: {
            specPath: 'apis/order-management/openapi.yaml',
            outputDir: 'docs/api-reference/rest/order-management',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          inventoryStorage: {
            specPath: 'apis/inventory-storage/openapi.yaml',
            outputDir: 'docs/api-reference/rest/inventory-storage',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          wesWorkPlanning: {
            specPath: 'apis/wes-work-planning/openapi.yaml',
            outputDir: 'docs/api-reference/rest/wes-work-planning',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          fulfillmentExecution: {
            specPath: 'apis/fulfillment-execution/openapi.yaml',
            outputDir: 'docs/api-reference/rest/fulfillment-execution',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          workforceManagement: {
            specPath: 'apis/workforce-management/openapi.yaml',
            outputDir: 'docs/api-reference/rest/workforce-management',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          facilityLayout: {
            specPath: 'apis/facility-layout/openapi.yaml',
            outputDir: 'docs/api-reference/rest/facility-layout',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          processPathManagement: {
            specPath: 'apis/process-path-management/openapi.yaml',
            outputDir: 'docs/api-reference/rest/process-path-management',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          laborPerformance: {
            specPath: 'apis/labor-performance/openapi.yaml',
            outputDir: 'docs/api-reference/rest/labor-performance',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
          laborPerformanceReports: {
            specPath: 'apis/labor-performance/openapi-reports.yaml',
            outputDir: 'docs/api-reference/rest/labor-performance-reports',
            sidebarOptions: {groupPathsBy: 'tag', categoryLinkSource: 'tag'},
            hideSendButton: true,
          },
        } satisfies Record<string, OpenApiPlugin.Options>,
      },
    ],
  ],

  themes: ['docusaurus-theme-openapi-docs', '@docusaurus/theme-mermaid'],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'warehouse-systems Docs',
      logo: {
        alt: 'warehouse-systems',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'strategicSidebar',
          position: 'left',
          label: 'Strategic Design',
        },
        {
          type: 'docSidebar',
          sidebarId: 'contextsSidebar',
          position: 'left',
          label: 'Bounded Contexts',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {
          to: '/adr',
          label: 'ADRs',
          position: 'left',
        },
        {
          href: 'https://github.com/claudioed/warehouse-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Overview', to: '/overview'},
            {label: 'Strategic Design', to: '/strategic-design/domain-vision'},
            {label: 'Bounded Contexts', to: '/contexts'},
          ],
        },
        {
          title: 'Ecosystem repositories',
          items: [
            {label: 'order-management', href: 'https://github.com/claudioed/order-management'},
            {label: 'inventory-storage', href: 'https://github.com/claudioed/inventory-storage'},
            {label: 'wes-work-planning', href: 'https://github.com/claudioed/wes-work-planning'},
            {label: 'fulfillment-execution', href: 'https://github.com/claudioed/fulfillment-execution'},
            {label: 'workforce-management', href: 'https://github.com/claudioed/workforce-management'},
            {label: 'facility-layout', href: 'https://github.com/claudioed/facility-layout'},
            {label: 'process-path-management', href: 'https://github.com/claudioed/process-path-management'},
            {label: 'labor-performance', href: 'https://github.com/claudioed/labor-performance'},
            {label: 'warehouse-ops-agent', href: 'https://github.com/claudioed/warehouse-ops-agent'},
          ],
        },
        {
          title: 'DDD reference method',
          items: [
            {label: 'ddd-crew (GitHub)', href: 'https://github.com/ddd-crew'},
            {label: 'Bounded Context Canvas', href: 'https://github.com/ddd-crew/bounded-context-canvas'},
            {label: 'Aggregate Design Canvas', href: 'https://github.com/ddd-crew/aggregate-design-canvas'},
            {label: 'Context Mapping', href: 'https://github.com/ddd-crew/context-mapping'},
            {label: 'Core Domain Charts', href: 'https://github.com/ddd-crew/core-domain-charts'},
            {label: 'Domain Message Flow Modelling', href: 'https://github.com/ddd-crew/domain-message-flow-modelling'},
          ],
        },
      ],
      copyright: `warehouse-systems documentation — built ${new Date().getFullYear()} with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'go', 'json', 'yaml', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
