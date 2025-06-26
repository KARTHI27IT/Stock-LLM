import React, { useState } from "react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault(); // prevent page reload
    // Here you can send the data to a server or validate it
    console.log("Login attempted with:", { email, password });

    // Example: simple check
    if (email === "test@example.com" && password === "123456") {
      alert("Login successful!");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="mb-3">
        <label htmlFor="emailInput" className="form-label">Email address</label>
        <input
          type="email"
          className="form-control"
          id="emailInput"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="passwordInput" className="form-label">Password</label>
        <input
          type="password"
          className="form-control"
          id="passwordInput"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary">Login</button>
    </form>
  );
};

export default Login;
