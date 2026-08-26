import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { TopProgressBar } from "./components/TopProgressBar";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
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
import Catalogue from "./pages/Catalogue";
import Checkout from "./pages/Checkout";
import { FloatingEditButton } from "./components/FloatingEditButton";
import { MembersOnlyGate } from "./components/MembersOnlyGate";

export default function App() {
  return (
    <Router>
      <TopProgressBar />
      <ScrollToTop />
      <MembersOnlyGate />
      <div className="flex flex-col min-h-screen bg-off-white text-ink font-sans selection:bg-cobalt selection:text-white antialiased w-full overflow-x-clip">
        <Navigation />
        <main className="flex-grow flex flex-col bg-off-white w-full min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/catalog" element={<Catalogue />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/:id" element={<JournalDetail />} />
            <Route path="/space" element={<Space />} />
            <Route path="/space/:id" element={<SpaceDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </main>
        <Footer />
        <ScrollToTopButton />
        <FloatingEditButton />
      </div>
    </Router>
  );
}

