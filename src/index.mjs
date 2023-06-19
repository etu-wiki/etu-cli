import React from "react";

import ReactDOM from "react-dom/client";

import Page from "./page.mjs";

import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
  useParams
} from "react-router-dom";

import CloverIIIF from "@samvera/clover-iiif";


function Clover() {
  const { presentId } = useParams();

  const id = `http://localhost:3000/p/${presentId}/manifest.json`;

  return <CloverIIIF id={id} />;
}

const router = createHashRouter([
  {
    path: "/",
    element: <Page />,
  },
  {
    path: "/clover/:presentId",
    element: <Clover />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
