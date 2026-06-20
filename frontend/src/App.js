import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import FamilyTreeApp from "@/components/FamilyTreeApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FamilyTreeApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
