import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import ProductDetail from "./pages/ProductDetail";
import Admin from "./pages/Admin";
import Journal from "./pages/Journal";
import JournalDetail from "./pages/JournalDetail";
import Space from "./pages/Space";
import SpaceDetail from "./pages/SpaceDetail";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Catalog from "./pages/Catalog";
import Checkout from "./pages/Checkout";
import { FloatingEditButton } from "./components/FloatingEditButton";

function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-off-white text-ink font-sans selection:bg-cobalt selection:text-white antialiased overflow-x-hidden w-full">
      <ScrollToTop />
      <Navigation />
      <main className="flex-grow flex flex-col bg-off-white overflow-x-hidden w-full">
        <Outlet />
      </main>
      <Footer />
      <FloatingEditButton />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <Home /> },
      { path: "collection", element: <Collection /> },
      { path: "catalog", element: <Catalog /> },
      { path: "product/:id", element: <ProductDetail /> },
      { path: "journal", element: <Journal /> },
      { path: "journal/:id", element: <JournalDetail /> },
      { path: "space", element: <Space /> },
      { path: "space/:id", element: <SpaceDetail /> },
      { path: "admin", element: <Admin /> },
      { path: "login", element: <Login /> },
      { path: "account", element: <Account /> },
      { path: "checkout", element: <Checkout /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

