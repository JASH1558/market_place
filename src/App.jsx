import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NewListing from "./pages/NewListing";
import ListingDetail from "./pages/ListingDetail";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-listing"
          element={
            <ProtectedRoute>
              <NewListing />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
