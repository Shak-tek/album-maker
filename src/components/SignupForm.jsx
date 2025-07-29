import { useState } from 'react';
import axios from 'axios';

export default function SignupForm() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [message, setMessage] = useState('');

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
      <input
        type="text"
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        required
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        required
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <button type="submit">Sign Up</button>
      <p>{message}</p>
    </form>
  );
}
