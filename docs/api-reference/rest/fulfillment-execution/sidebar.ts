import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/rest/fulfillment-execution/fulfillment-execution-api",
    },
    {
      type: "category",
      label: "Tasks",
      link: {
        type: "doc",
        id: "api-reference/rest/fulfillment-execution/tasks",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/create-task",
          label: "Create a task and place it in the pool",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/get-tasks-by-order-ref",
          label: "Look up every task recorded for an order reference",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/claim-next-task",
          label: "PULL-dispatch the best-fit pending task to this station",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/renew-lease",
          label: "Extend the active lease held by the claiming station",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/complete-task",
          label: "Complete a task on behalf of the station that claimed it",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/seal-package",
          label: "Scan contents and seal a Package for a Pack task's order",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/get-queue-depth",
          label: "Read the pending-task count for a process path (read model)",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/expire-leases",
          label: "Sweep every Claimed task whose lease has expired back to Pending",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Stations",
      link: {
        type: "doc",
        id: "api-reference/rest/fulfillment-execution/stations",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/register-station",
          label: "Register or re-register a station",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/claim-next-task",
          label: "PULL-dispatch the best-fit pending task to this station",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/check-in-station",
          label: "Check a worker or robot into a station",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/check-out-station",
          label: "Check the current occupant out of a station",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/get-installed-capacity",
          label: "Read how many registered stations hold a given capability (read model)",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Packages",
      link: {
        type: "doc",
        id: "api-reference/rest/fulfillment-execution/packages",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/seal-package",
          label: "Scan contents and seal a Package for a Pack task's order",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/run-slam",
          label: "Run the SLAM weigh-check on a sealed package",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "System",
      link: {
        type: "doc",
        id: "api-reference/rest/fulfillment-execution/system",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/fulfillment-execution/get-healthz",
          label: "Liveness check",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
