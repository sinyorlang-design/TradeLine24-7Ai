import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import KitchenSink from "./dev/KitchenSink.jsx";
const router = createBrowserRouter([
  { path: "/", element: <App/> },
  { path: "/dev/kitchen", element: <KitchenSink/> },
]);
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
