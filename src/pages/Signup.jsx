import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api, { fetchCountries } from "../api/api.js";
import { UserContext } from "../context/UserContext.jsx";

export default function Signup() {
  const { login } = useContext(UserContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [orgName, setOrgName] = useState("");
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCountries = async () => {
      const list = await fetchCountries();
      setCountries(list);
    };
    loadCountries();
  }, []);

  useEffect(() => {
    const selected = countries.find((c) => c.code === countryCode);
    setCurrency(selected?.currency || "");
  }, [countryCode, countries]);

  const validateForm = () => {
    if (!name.trim() || name.length < 2) {
      setError("Name must be at least 2 characters.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email address.");
      return false;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (!countryCode || countryCode.length !== 2) {
      setError("Please select a valid country.");
      return false;
    }
    if (!currency || currency.length !== 3) {
      setError("Currency is invalid.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/signup", {
        name,
        email,
        password,
        country_code: countryCode,
        currency,
        org_name: orgName,
      });

      const { token, user } = res.data;

      // Log in automatically after signup
      login(user, token);

      navigate("/expenses");
    } catch (err) {
      console.error("Signup failed:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Signup</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Organization Name (optional)"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.currency})
            </option>
          ))}
        </select>

        <input
          type="text"
          value={currency}
          readOnly
          className="w-full p-2 border rounded bg-gray-100"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Signing up..." : "Signup"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-blue-600 hover:underline">
          Login
        </a>
      </p>
    </div>
  );
}
