import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import DemoPage from "./pages/DemoPage";
import HomePage from "./pages/HomePage";
import TankPage from "./pages/TankPage";

const router = createBrowserRouter([{ path: "/", element: <Layout />, children: [
  { index: true, element: <HomePage /> },
  { path: "tank/:tankId", element: <TankPage /> },
  { path: "admin/demo", element: <DemoPage /> },
]}]);

export default function App() { return <RouterProvider router={router} />; }
