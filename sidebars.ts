import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

import orderManagementSidebar from './docs/api-reference/rest/order-management/sidebar';
import inventoryStorageSidebar from './docs/api-reference/rest/inventory-storage/sidebar';
import wesWorkPlanningSidebar from './docs/api-reference/rest/wes-work-planning/sidebar';
import fulfillmentExecutionSidebar from './docs/api-reference/rest/fulfillment-execution/sidebar';
import workforceManagementSidebar from './docs/api-reference/rest/workforce-management/sidebar';
import facilityLayoutSidebar from './docs/api-reference/rest/facility-layout/sidebar';
import processPathManagementSidebar from './docs/api-reference/rest/process-path-management/sidebar';
import laborPerformanceSidebar from './docs/api-reference/rest/labor-performance/sidebar';
import laborPerformanceReportsSidebar from './docs/api-reference/rest/labor-performance-reports/sidebar';

/**
 * Four independent sidebars, one per navbar item:
 *  - strategicSidebar:  ddd-crew strategic-design artifacts for the WHOLE fleet
 *  - contextsSidebar:   per-bounded-context tactical DDD + business + async docs
 *  - apiSidebar:        generated REST reference (docusaurus-plugin-openapi-docs)
 *  - (ADRs is a single top-level link, not a sidebar, see navbar)
 */
const sidebars: SidebarsConfig = {
  strategicSidebar: [
    'overview',
    {
      type: 'category',
      label: 'Strategic Design',
      link: {type: 'doc', id: 'strategic-design/index'},
      items: [
        'strategic-design/domain-vision',
        'strategic-design/core-domain-chart',
        'strategic-design/subdomain-classification',
        'strategic-design/context-map',
        'strategic-design/domain-message-flows',
        'strategic-design/ubiquitous-language',
      ],
    },
    'glossary',
  ],

  contextsSidebar: [
    'contexts/index',
    {
      type: 'category',
      label: 'order-management',
      link: {type: 'doc', id: 'contexts/order-management/index'},
      items: [
        'contexts/order-management/business-context',
        'contexts/order-management/ubiquitous-language',
        'contexts/order-management/bounded-context-canvas',
        'contexts/order-management/aggregate-design-canvas',
        'contexts/order-management/domain-events',
      ],
    },
    {
      type: 'category',
      label: 'inventory-storage',
      link: {type: 'doc', id: 'contexts/inventory-storage/index'},
      items: [
        'contexts/inventory-storage/business-context',
        'contexts/inventory-storage/ubiquitous-language',
        'contexts/inventory-storage/bounded-context-canvas',
        'contexts/inventory-storage/aggregate-design-canvas',
        'contexts/inventory-storage/domain-events',
        'contexts/inventory-storage/async-api',
      ],
    },
    {
      type: 'category',
      label: 'wes-work-planning',
      link: {type: 'doc', id: 'contexts/wes-work-planning/index'},
      items: [
        'contexts/wes-work-planning/business-context',
        'contexts/wes-work-planning/ubiquitous-language',
        'contexts/wes-work-planning/bounded-context-canvas',
        'contexts/wes-work-planning/aggregate-design-canvas',
        'contexts/wes-work-planning/domain-events',
        'contexts/wes-work-planning/async-api',
      ],
    },
    {
      type: 'category',
      label: 'fulfillment-execution',
      link: {type: 'doc', id: 'contexts/fulfillment-execution/index'},
      items: [
        'contexts/fulfillment-execution/business-context',
        'contexts/fulfillment-execution/ubiquitous-language',
        'contexts/fulfillment-execution/bounded-context-canvas',
        'contexts/fulfillment-execution/aggregate-design-canvas',
        'contexts/fulfillment-execution/domain-events',
        'contexts/fulfillment-execution/async-api',
      ],
    },
    {
      type: 'category',
      label: 'workforce-management',
      link: {type: 'doc', id: 'contexts/workforce-management/index'},
      items: [
        'contexts/workforce-management/business-context',
        'contexts/workforce-management/ubiquitous-language',
        'contexts/workforce-management/bounded-context-canvas',
        'contexts/workforce-management/aggregate-design-canvas',
        'contexts/workforce-management/domain-events',
        'contexts/workforce-management/async-api',
      ],
    },
    {
      type: 'category',
      label: 'facility-layout',
      link: {type: 'doc', id: 'contexts/facility-layout/index'},
      items: [
        'contexts/facility-layout/business-context',
        'contexts/facility-layout/ubiquitous-language',
        'contexts/facility-layout/bounded-context-canvas',
        'contexts/facility-layout/aggregate-design-canvas',
        'contexts/facility-layout/domain-events',
      ],
    },
    {
      type: 'category',
      label: 'process-path-management',
      link: {type: 'doc', id: 'contexts/process-path-management/index'},
      items: [
        'contexts/process-path-management/business-context',
        'contexts/process-path-management/ubiquitous-language',
        'contexts/process-path-management/bounded-context-canvas',
        'contexts/process-path-management/aggregate-design-canvas',
        'contexts/process-path-management/domain-events',
        'contexts/process-path-management/async-api',
      ],
    },
    {
      type: 'category',
      label: 'labor-performance',
      link: {type: 'doc', id: 'contexts/labor-performance/index'},
      items: [
        'contexts/labor-performance/business-context',
        'contexts/labor-performance/ubiquitous-language',
        'contexts/labor-performance/bounded-context-canvas',
        'contexts/labor-performance/aggregate-design-canvas',
        'contexts/labor-performance/domain-events',
        'contexts/labor-performance/async-api',
      ],
    },
    {
      type: 'category',
      label: 'warehouse-ops-agent',
      link: {type: 'doc', id: 'contexts/warehouse-ops-agent/index'},
      items: [
        'contexts/warehouse-ops-agent/business-context',
        'contexts/warehouse-ops-agent/ubiquitous-language',
        'contexts/warehouse-ops-agent/bounded-context-canvas',
      ],
    },
  ],

  apiSidebar: [
    'api-reference/index',
    {
      type: 'category',
      label: 'order-management',
      items: [...orderManagementSidebar],
    },
    {
      type: 'category',
      label: 'inventory-storage',
      items: [...inventoryStorageSidebar, 'api-reference/async/inventory-storage'],
    },
    {
      type: 'category',
      label: 'wes-work-planning',
      items: [...wesWorkPlanningSidebar, 'api-reference/async/wes-work-planning'],
    },
    {
      type: 'category',
      label: 'fulfillment-execution',
      items: [...fulfillmentExecutionSidebar, 'api-reference/async/fulfillment-execution'],
    },
    {
      type: 'category',
      label: 'workforce-management',
      items: [...workforceManagementSidebar, 'api-reference/async/workforce-management'],
    },
    {
      type: 'category',
      label: 'facility-layout',
      items: [...facilityLayoutSidebar],
    },
    {
      type: 'category',
      label: 'process-path-management',
      items: [...processPathManagementSidebar, 'api-reference/async/process-path-management'],
    },
    {
      type: 'category',
      label: 'labor-performance',
      items: [
        ...laborPerformanceSidebar,
        ...laborPerformanceReportsSidebar,
        'api-reference/async/labor-performance',
      ],
    },
    {
      type: 'category',
      label: 'warehouse-ops-agent',
      items: ['api-reference/warehouse-ops-agent'],
    },
  ],
};

export default sidebars;
