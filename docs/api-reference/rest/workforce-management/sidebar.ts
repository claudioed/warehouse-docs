import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/rest/workforce-management/workforce-management-api",
    },
    {
      type: "category",
      label: "Associates",
      link: {
        type: "doc",
        id: "api-reference/rest/workforce-management/associates",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/start-associate-shift",
          label: "Start an associate's shift",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/certify-associate",
          label: "Add a certification to an associate",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/start-associate-break",
          label: "Start a logged break for an associate",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/end-associate-break",
          label: "End a logged break for an associate",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/end-associate-shift",
          label: "End an associate's shift",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Shift Plans",
      link: {
        type: "doc",
        id: "api-reference/rest/workforce-management/shift-plans",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/propose-path-plan",
          label: "Propose planned heads for a path (pure computation, not committed)",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/commit-shift-plan",
          label: "Commit a shift's headcount split across paths",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Assignments",
      link: {
        type: "doc",
        id: "api-reference/rest/workforce-management/assignments",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/assign-labor",
          label: "Assign an associate to a path",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Staffing",
      link: {
        type: "doc",
        id: "api-reference/rest/workforce-management/staffing",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/get-staffing-gap",
          label: "Get the staffing gap for a path within a committed shift plan",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "System",
      link: {
        type: "doc",
        id: "api-reference/rest/workforce-management/system",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/workforce-management/healthz",
          label: "Liveness check",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
