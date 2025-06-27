import './Login.css';
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
 const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const payLoad = {
      email: email,
      password: password
    };
    axios.post("http://localhost:5000/user/login", payLoad)
      .then(result => {
        console.log(result.data);
        alert(result.data.message);
        if(result.status){
        setEmail('');
        setPassword('');
        localStorage.setItem('userEmail', result.data.email);
        localStorage.setItem('token', result.data.token);
        navigate('/dashboard');
        }
      })
      .catch(err => {
        console.error(err);
        alert("Signup failed");
      })
  };


  return (
    <div className="login mt-5 m-auto p-lg-5">
      <div className='my-4'>
        <h1>Login</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">
            Email address
          </label>
          <input
            type="email"
            className="form-control"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">
            Password
          </label>
          <input
            type="password"
            className="form-control"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>
    </div>
  );
}

export default Login;
