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
    <div className='signupForm'>
    <Form value={form} onChange={(next) => setForm(next)} onSubmit={handleSubmit}>
      <FormField name="name" label="Full Name" required>
        <TextInput placeholder="Full Name" name="name" value={form.name} onChange={handleChange('name')} />
      </FormField> 
      <FormField name="address" label="Address">
        <TextInput placeholder="Address" name="address" value={form.address} onChange={handleChange('address')} />
      </FormField>
      <FormField name="postcode" label="Postcode">
        <TextInput placeholder="Postcode" name="postcode" value={form.postcode} onChange={handleChange('postcode')} />
      </FormField>
      <FormField name="phone" label="Phone">
        <TextInput name="phone" placeholder="Phone" value={form.phone} onChange={handleChange('phone')} />
      </FormField>
      <FormField name="email" label="Email" required>
        <TextInput type="email" placeholder="Email" name="email" /* value={form.email} */ onChange={handleChange('email')} />
      </FormField>
      <FormField name="password" label="Password" required>
        <TextInput placeholder="Password" type="password" name="password" /* value={form.password}*/ onChange={handleChange('password')} />
      </FormField>
      <Box align="center">
        <Button type="submit" label="Sign Up" className='btn btn-primary xsmall' />
        {message && (
          <Box background="status-critical" pad="small" round animation="fadeIn">
            <Text>{message}</Text>
          </Box>
        )}
        <Button
          type="button"
          label="Already have an account? Log in"
          onClick={onSignIn}
          className='btn btn-text'
        />
      </Box>

    </Form>
    </div>
  );
}
