import { useEffect, useState, useContext } from "react";
import api, { convertCurrency, fetchCountries } from "../api/api.js";
import ExpenseItem from "../components/Expenses/ExpenseItem.jsx";
import { UserContext } from "../context/UserContext.jsx";

export default function ExpensesPage() {
  const { user, loading: userLoading } = useContext(UserContext);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [manualItems, setManualItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);

  // Load available currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      const countries = await fetchCountries();
      const uniqueCurrencies = [
        ...new Set(countries.map((c) => c.currency).filter(Boolean)),
      ];
      setCurrencies(uniqueCurrencies);
    };
    loadCurrencies();
  }, []);

  // Initialize manual items with org currency
  useEffect(() => {
    if (user) {
      const defaultItem = {
        description: "",
        amount: 0,
        original_amount: 0,
        currency: user.org_currency || "USD",
      };
      setManualItems([defaultItem]);
    }
  }, [user]);

  // Fetch expenses
  useEffect(() => {
    if (user) fetchExpenses();
    else setExpenses([]);
  }, [user]);

  // Handle OCR file upload
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    handleOCR(selectedFiles);
  };

  const handleOCR = async (selectedFiles) => {
    if (!selectedFiles.length) return;
    setOcrLoading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("receipts", file));

      const res = await api.post("/ocr/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.expenses) {
        const parsedItems = res.data.expenses.flatMap((exp) =>
          (exp.items || []).map((item) => ({
            description: item.description || "No description",
            amount: parseFloat(item.amount) || 0,
            original_amount: parseFloat(item.original_amount) || 0,
            currency: user.org_currency || "USD",
          }))
        );

        setManualItems((prevItems) => {
          const existingItems = prevItems.filter((i) => i.description || i.amount);
          const mergedItems = [...existingItems];

          parsedItems.forEach((ocrItem) => {
            const duplicate = mergedItems.some(
              (mi) => mi.description === ocrItem.description && mi.amount === ocrItem.amount
            );
            if (!duplicate) mergedItems.push(ocrItem);
          });

          return mergedItems.length
            ? mergedItems
            : [
                {
                  description: "",
                  amount: 0,
                  original_amount: 0,
                  currency: user.org_currency || "USD",
                },
              ];
        });
      }
    } catch (err) {
      console.error("OCR failed:", err);
    }
    setOcrLoading(false);
  };

  // Manual item changes
  const handleManualItemChange = (index, field, value) => {
    const items = [...manualItems];
    if (field === "amount") {
      const amount = parseFloat(value) || 0;
      items[index].amount = amount;
      items[index].original_amount = amount;
    } else {
      items[index][field] = value;
    }
    setManualItems(items);
  };

  const addManualItem = () => {
    setManualItems([
      ...manualItems,
      {
        description: "",
        amount: 0,
        original_amount: 0,
        currency: user?.org_currency || "USD",
      },
    ]);
  };

  const removeManualItem = (index) =>
    setManualItems(manualItems.filter((_, i) => i !== index));

  // Fetch expenses from backend
  const fetchExpenses = async () => {
    if (!user) return;
    try {
      const endpoint = user.role?.toLowerCase() === "employee" ? "/expenses/mine" : "/expenses/team";
      const res = await api.get(endpoint);

      const expensesWithConverted = await Promise.all(
        res.data.map(async (exp) => {
          const convertedItems = await Promise.all(
            (exp.items || []).map(async (item) => ({
              ...item,
              amount: await convertCurrency(item.amount, item.currency, user.org_currency),
              currency: user.org_currency,
            }))
          );
          return { ...exp, items: convertedItems };
        })
      );

      setExpenses(expensesWithConverted);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
      setExpenses([]);
    }
  };

  // Submit expense
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const formData = new FormData();
      const expenseCurrency = user.org_currency || "USD";

      formData.append("title", title);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("currency", expenseCurrency);

      manualItems.forEach((item, i) => {
        const itemCurrency = item.currency || expenseCurrency;
        const itemAmount = parseFloat(item.amount) || 0;
        const itemOriginalAmount = parseFloat(item.original_amount) || itemAmount;

        formData.append(`items[${i}][description]`, item.description || "No description");
        formData.append(`items[${i}][amount]`, itemAmount);
        formData.append(`items[${i}][original_amount]`, itemOriginalAmount);
        formData.append(`items[${i}][currency]`, itemCurrency);
        formData.append(`items[${i}][exchange_rate]`, 1);
      });

      files.forEach((file) => formData.append("receipts", file));

      console.log("Submitting Expense Data:", { title, category, description, currency: expenseCurrency, items: manualItems, files });

      await api.post("/expenses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reset form
      setTitle("");
      setCategory("");
      setDescription("");
      setFiles([]);
      setManualItems([
        {
          description: "",
          amount: 0,
          original_amount: 0,
          currency: expenseCurrency,
        },
      ]);

      fetchExpenses();
    } catch (err) {
      console.error("Failed to submit expense:", err);
    }

    setLoading(false);
  };

  const handleApproval = async (expenseId, status) => {
    try {
      await api.post(`/approvals/${expenseId}`, { status });
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === expenseId
            ? {
                ...exp,
                status,
                pending_approvers: exp.pending_approvers.filter(
                  (a) => a.id !== exp.current_approver_id
                ),
              }
            : exp
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (userLoading) return <p className="text-center mt-6">Loading user...</p>;
  if (!user) return <p className="text-center mt-6">Please login to view expenses.</p>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {user.role.toLowerCase() === "employee" && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 sm:p-6 rounded shadow">
          <h1 className="text-2xl font-bold">Submit Expense</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
          />

          <div>
            <label className="block mb-1 font-medium">Receipt Images (OCR)</label>
            <input type="file" multiple onChange={handleFileChange} disabled={ocrLoading} />
            {ocrLoading && <p className="text-sm text-gray-500 mt-1">Processing OCR...</p>}
          </div>

          <div className="space-y-2">
            <h2 className="font-medium mb-2">Expense Items</h2>
            {manualItems.map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleManualItemChange(i, "description", e.target.value)}
                  className="flex-1 p-2 border rounded"
                  disabled={ocrLoading}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(e) => handleManualItemChange(i, "amount", e.target.value)}
                  className="w-full sm:w-28 p-2 border rounded"
                  disabled={ocrLoading}
                />
                <select
                  value={item.currency}
                  onChange={(e) => handleManualItemChange(i, "currency", e.target.value)}
                  className="w-full sm:w-28 p-2 border rounded"
                  disabled={ocrLoading}
                >
                  <option value={user.org_currency || "USD"}>{user.org_currency || "USD"}</option>
                  {currencies.filter((c) => c !== user.org_currency).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeManualItem(i)} className="text-red-500 font-bold" disabled={ocrLoading}>X</button>
              </div>
            ))}
            <button type="button" onClick={addManualItem} className="text-blue-600 font-medium mt-1" disabled={ocrLoading}>Add Item</button>
          </div>

          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {loading ? "Submitting..." : "Submit Expense"}
          </button>
        </form>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">
          {user.role.toLowerCase() === "employee" ? "My Expenses" : "Team Expenses"}
        </h2>
        <div className="space-y-4">
          {expenses.map((exp) => (
            <ExpenseItem key={exp.id} expense={exp} role={user.role} onApprove={handleApproval} />
          ))}
        </div>
      </div>
    </div>
  );
}
