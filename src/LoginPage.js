import React, { useState } from "react";
import { Box, Button, Text, TextInput } from "grommet";
import axios from "axios";

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

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

  const submitSignup = async () => {
    try {
      await axios.post("/.netlify/functions/users/signup", form);
      setOtpSent(true);
    } catch (err) {
      alert("Signup failed");
    }
  };

  const submitVerify = async () => {
    try {
      const res = await axios.post("/.netlify/functions/users/verify", {
        email: form.email,
        otp,
      });
      onLogin(res.data.user);
    } catch (err) {
      alert("Verification failed");
    }
  };

  return (
    <Box pad="large" gap="medium" align="center">
      {mode === "login" && (
        <>
          <TextInput placeholder="Email" value={form.email} onChange={update("email")} />
          <TextInput placeholder="Password" type="password" value={form.password} onChange={update("password")} />
          <Button label="Login" onClick={submitLogin} primary />
          <Button label="Need an account?" onClick={() => setMode("signup")}></Button>
        </>
      )}
      {mode === "signup" && !otpSent && (
        <>
          <TextInput placeholder="Name" value={form.name} onChange={update("name")} />
          <TextInput placeholder="Email" value={form.email} onChange={update("email")} />
          <TextInput placeholder="Phone" value={form.phone} onChange={update("phone")} />
          <TextInput placeholder="Address" value={form.address} onChange={update("address")} />
          <TextInput placeholder="Password" type="password" value={form.password} onChange={update("password")} />
          <Button label="Sign Up" onClick={submitSignup} primary />
          <Button label="Have an account?" onClick={() => setMode("login")}></Button>
        </>
      )}
      {mode === "signup" && otpSent && (
        <>
          <Text>Enter OTP sent to your email</Text>
          <TextInput placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <Button label="Verify" onClick={submitVerify} primary />
        </>
      )}
    </Box>
  );
}
