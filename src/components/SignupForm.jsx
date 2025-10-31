import { useState } from 'react';
import { Box, Button, Form, FormField, TextInput, Text } from 'grommet';
import axios from 'axios';

export default function SignupForm({ onSignup, onSignIn }) {
  const [form, setForm] = useState({
    name: '', address: '', postcode: '', phone: '',
    email: '', password: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (name) => (event) =>
    setForm({ ...form, [name]: event.target.value });

  const handleSubmit = async () => {
    try {
      const res = await axios.post('/.netlify/functions/signup', form);
      setMessage('');
      if (onSignup) onSignup(res.data);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <Form value={form} onChange={(next) => setForm(next)} onSubmit={handleSubmit}>
      <FormField name="name" label="Full Name" required>
        <TextInput name="name" value={form.name} onChange={handleChange('name')} />
      </FormField>
      <FormField name="address" label="Address">
        <TextInput name="address" value={form.address} onChange={handleChange('address')} />
      </FormField>
      <FormField name="postcode" label="Postcode">
        <TextInput name="postcode" value={form.postcode} onChange={handleChange('postcode')} />
      </FormField>
      <FormField name="phone" label="Phone">
        <TextInput name="phone" value={form.phone} onChange={handleChange('phone')} />
      </FormField>
      <FormField name="email" label="Email" required>
        <TextInput type="email" name="email" value={form.email} onChange={handleChange('email')} />
      </FormField>
      <FormField name="password" label="Password" required>
        <TextInput type="password" name="password" value={form.password} onChange={handleChange('password')} />
      </FormField>
      <Box pad={{ vertical: 'medium' }} align="center" gap="small">
        <Button type="submit" label="Sign Up" primary />
        {message && (
          <Box background="status-critical" pad="small" round animation="fadeIn">
            <Text>{message}</Text>
          </Box>
        )}
        <Button
          type="button"
          label="Already have an account? Log in"
          onClick={onSignIn}
          secondary
        />
      </Box>
    </Form>
  );
}
