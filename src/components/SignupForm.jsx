// src/components/SignupForm.jsx
import { useState } from 'react';
import axios from 'axios';

export default function SignupForm() {
  const [form, setForm] = useState({
    email: '', password: '',
    name: '', address: '',
    postcode: '', phone: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/.netlify/functions/signup', form);
      setMessage(`User created: ${res.data.email}`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Full Name" onChange={handleChange} />
      <input name="address" placeholder="Address" onChange={handleChange} />
      <input name="postcode" placeholder="Postcode" onChange={handleChange} />
      <input name="phone" placeholder="Phone Number" onChange={handleChange} />
      <input name="email" type="email" placeholder="Email" required onChange={handleChange} />
      <input name="password" type="password" placeholder="Password" required onChange={handleChange} />
      <button type="submit">Sign Up</button>
      <p>{message}</p>
    </form>
  );
}
