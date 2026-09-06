import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/rest/inventory-storage/inventory-storage-api",
    },
    {
      type: "category",
      label: "Stock",
      link: {
        type: "doc",
        id: "api-reference/rest/inventory-storage/stock",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/receive-stock",
          label: "Acknowledge inbound stock for a SKU",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/stow-stock",
          label: "Stow received stock into a bin",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Reservations",
      link: {
        type: "doc",
        id: "api-reference/rest/inventory-storage/reservations",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/get-reservations-by-demand-ref",
          label: "Look up every reservation for a demand reference",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/reserve-stock",
          label: "Create a revocable reservation against usable inventory",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/revoke-reservation",
          label: "Revoke a reservation",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/confirm-pick",
          label: "Confirm a reservation's physical pick",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Inventory",
      link: {
        type: "doc",
        id: "api-reference/rest/inventory-storage/inventory",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/get-usable-inventory",
          label: "Get usable inventory for a SKU",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Bins",
      link: {
        type: "doc",
        id: "api-reference/rest/inventory-storage/bins",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/run-cycle-count",
          label: "Record a physical cycle count for a bin",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Products",
      link: {
        type: "doc",
        id: "api-reference/rest/inventory-storage/products",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/classify-product",
          label: "Register or replace a SKU's product classification",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/get-product-classification",
          label: "Get a SKU's current product classification",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Health",
      link: {
        type: "doc",
        id: "api-reference/rest/inventory-storage/health",
      },
      items: [
        {
          type: "doc",
          id: "api-reference/rest/inventory-storage/get-healthz",
          label: "Liveness probe",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
