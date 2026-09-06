import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/rest/wes-work-planning/wes-work-planning-release",
    },
    {
      type: "category",
      label: "Charge Forecast",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/charge-forecast",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/receive-charge-forecast",
          label: "Receive a charge forecast for a process path",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Shift Plan",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/shift-plan",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/commit-shift-plan",
          label: "Commit this service's shift plan for a process path",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Work Units",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/work-units",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/enqueue-work-unit",
          label: "Enqueue a work unit onto a process path's work pool",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/get-work-units-by-reference",
          label: "Look up work units by their external order-line reference",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/record-completion",
          label: "Record completion of a released work unit",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Release",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/release",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/release-next-work",
          label: "Release the next highest-priority work unit on a process path",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Telemetry",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/telemetry",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/sample-backlog",
          label: "Sample live backlog telemetry for a process path",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Rebalance",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/rebalance",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/rebalance-decision",
          label: "Get the flow-balancing recommendation for a process path",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Labor Plan View",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/labor-plan-view",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/get-labor-plan-view",
          label: "Get the latest labor plan Workforce Management reported for a path",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Inventory View",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/inventory-view",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/get-inventory-view",
          label: "Get the latest observed usable inventory for a SKU",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Health",
      link: {
        type: "doc",
        id: "api-reference/rest/wes-work-planning/health",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/wes-work-planning/health-check",
          label: "Health check",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
