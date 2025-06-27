import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Dashboard from './Components/Dashboard/Dashboard';
import Login from './Components/Login/Login';
import Signup from './Components/Signup/Signup';
import Navbar from './Components/Navbar/Navbar';
import Table from './Components/Table/Table';

function App() {
  const [count, setCount] = useState(0);

  // Check if user is logged in based on localStorage
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />} />

        {/* Dashboard route */}
        <Route
          path="/dashboard"
          element={
            <>
              <Navbar />
              <Dashboard />
            </>
          }
        />

        {/* Login route */}
        <Route
          path="/login"
          element={
            <>
              <Navbar />
              <Login />
            </>
          }
        />

        {/* Signup route */}
        <Route
          path="/signup"
          element={
            <>
              <Navbar />
              <Signup />
            </>
          }
        />

        <Route
          path="/detailsTable"
          element={
            <>
              <Navbar />
              <Table />
            </>
          }
        />
      </Routes>
    </>
  );
}

export default App;
