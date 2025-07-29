import React, { useState } from "react";
import { Box, Button, TextInput } from "grommet";
import axios from "axios";
import SignupForm from "./components/SignupForm";

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submitLogin = async () => {
    try {
      const res = await axios.post("/.netlify/functions/users/login", {
        email: form.email,
        password: form.password,
      });
      onLogin(res.data.user);
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <Box pad="large" gap="medium" align="center">
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
          <Button label="Need an account?" onClick={() => setMode("signup")} />
        </>
      )}
      {mode === "signup" && (
        <>
          <SignupForm />
          <Button label="Have an account?" onClick={() => setMode("login")} />
        </>
      )}
    </Box>
  );
}
