import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Loading from './components/Loading'

const AboutPage = lazy(() => import('./pages/AboutPage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const TankPage = lazy(() => import('./pages/TankPage'))

const deferred = element => <Suspense fallback={<Loading label="Loading page…" />}>{element}</Suspense>

const router = createBrowserRouter([{ path: '/', element: <Layout />, children: [
  { index: true, element: deferred(<HomePage />) },
  { path: 'tank/:tankId', element: deferred(<TankPage />) },
  { path: 'demo', element: deferred(<DemoPage />) },
  { path: 'about', element: deferred(<AboutPage />) },
  { path: '*', element: <div className="page-message"><h1>Page not found</h1><a href="/">Return home</a></div> },
]}])

export default function App() { return <RouterProvider router={router} /> }
