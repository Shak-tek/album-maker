import React, { useState, useEffect } from "react";
import { Box, Button, Heading, TextInput, Text } from "grommet";
import axios from "axios";
import SignupForm from "./components/SignupForm";

export default function LoginPage({ onLogin, initialMode = "login", message = "" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setError("");
  }, [initialMode]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submitLogin = async () => {
    try {
      const res = await axios.post("/.netlify/functions/login", {
        email: form.email,
        password: form.password,
      });
      setError("");
      onLogin(res.data.user);
    } catch (err) {
      setError("Login failed");
    }
  };

  return (
    <Box pad="large" gap="medium" align="center" width="medium">
      <Heading level={2} margin="none">
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </Heading>
      {message && (
        <Box background="light-2" pad="small" round="xsmall">
          <Text textAlign="center">{message}</Text>
        </Box>
      )}
      {mode === "login" && (
        <>
          <TextInput
            placeholder="Email"
            value={form.email}
            onChange={update("email")}
          />
          <TextInput
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={update("password")}
          />
          <Button label="Login" onClick={submitLogin} primary />
          {error && (
            <Box background="status-critical" pad="small" round animation="fadeIn">
              <Text>{error}</Text>
            </Box>
          )}
          <Button label="Need an account?" onClick={() => setMode("signup")} />
        </>
      )}
      {mode === "signup" && (
        <>
          <SignupForm
            onSignup={onLogin}
            onSignIn={() => setMode("login")}
          />
        </>
      )}
    </Box>
  );
}
