import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ------------------- REQUEST INTERCEPTOR -------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------- RESPONSE INTERCEPTOR -------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/**
 * Fetch country list with currencies
 * Returns [{ name: "India", code: "IN", currency: "INR" }, ...]
 */
export const fetchCountries = async () => {
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,currencies"
    );
    const data = await res.json();
    return data
      .map((c) => ({
        name: c.name.common,
        code: c.cca2,
        currency: Object.keys(c.currencies || {})[0] || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("Failed to fetch countries:", err);
    return [];
  }
};

/**
 * Convert amount from one currency to another
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;

  try {
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    const data = await res.json();
    const rate = data.rates[toCurrency];
    if (!rate) throw new Error(`Rate not found for ${toCurrency}`);
    return amount * rate;
  } catch (err) {
    console.error("Currency conversion failed:", err);
    return amount; // fallback to original
  }
};

export default api;
