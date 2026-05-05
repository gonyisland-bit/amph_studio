/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import ProductDetail from "./pages/ProductDetail";
import Admin from "./pages/Admin";
import Journal from "./pages/Journal";
import JournalDetail from "./pages/JournalDetail";
import Space from "./pages/Space";
import SpaceDetail from "./pages/SpaceDetail";

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-off-white text-ink font-sans selection:bg-cobalt selection:text-white antialiased">
        <Navigation />
        <main className="flex-grow flex flex-col bg-off-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/:id" element={<JournalDetail />} />
            <Route path="/space" element={<Space />} />
            <Route path="/space/:id" element={<SpaceDetail />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

