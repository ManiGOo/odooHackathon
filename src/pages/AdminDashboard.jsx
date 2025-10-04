import { useEffect, useState, useContext } from "react";
import api from "../api/api.js";
import { UserContext } from "../context/UserContext.jsx";

export default function AdminDashboard() {
  const { user, refreshUser } = useContext(UserContext);

  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "employee",
    managerId: "",
    password: "",
  });

  // Fetch all users
  const fetchUsers = async () => {
    if (user?.role?.toLowerCase() !== "admin") return;
    setLoadingUsers(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
    setLoadingUsers(false);
  };

  // Fetch expenses with their approval instances
  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      if (user?.role?.toLowerCase() !== "admin") {
        setExpenses([]);
        return;
      }

      // Fetch expenses
      const resExpenses = await api.get("/expenses");

      // Fetch approval instances for each expense
      const expensesWithApprovals = await Promise.all(
        resExpenses.data.map(async (expense) => {
          const resApprovals = await api.get(`/approvals/expense/${expense.id}`);
          return { ...expense, approvals: resApprovals.data };
        })
      );

      setExpenses(expensesWithApprovals);
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    }
    setLoadingExpenses(false);
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchExpenses();
    }
  }, [user]);

  const handleNewUserChange = (field, value) => {
    setNewUser({ ...newUser, [field]: value });
  };

  const handleCreateUser = async () => {
    try {
      if (newUser.role === "employee" && !newUser.managerId) {
        alert("Please assign a manager for an employee.");
        return;
      }

      await api.post("/users", {
        ...newUser,
        manager_id: newUser.managerId || null,
      });

      setNewUser({
        name: "",
        email: "",
        role: "employee",
        managerId: "",
        password: "",
      });

      fetchUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/users/${userId}/role`, { role });
      fetchUsers();
      if (userId === user.id) await refreshUser();
    } catch (err) {
      console.error("Failed to change role:", err);
    }
  };

  const handleOverrideApproval = async (expenseId, status) => {
    try {
      await api.post(`/approvals/${expenseId}/override`, { status });
      fetchExpenses(); // refresh expense and approvals
    } catch (err) {
      console.error("Override failed:", err);
    }
  };

  if (!user || user.role?.toLowerCase() !== "admin") {
    return <p className="text-center mt-6">Access denied. Admins only.</p>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Admin Dashboard</h1>

      {/* Users Section */}
      <section className="bg-white p-4 sm:p-6 rounded shadow space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold">Users</h2>

        {/* New User Form */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <input
            type="text"
            placeholder="Name"
            value={newUser.name}
            onChange={(e) => handleNewUserChange("name", e.target.value)}
            className="p-2 border rounded flex-1"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => handleNewUserChange("email", e.target.value)}
            className="p-2 border rounded flex-1"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => handleNewUserChange("password", e.target.value)}
            className="p-2 border rounded flex-1"
          />
          <select
            value={newUser.role}
            onChange={(e) => handleNewUserChange("role", e.target.value)}
            className="p-2 border rounded"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
          <select
            value={newUser.managerId}
            onChange={(e) => handleNewUserChange("managerId", e.target.value)}
            className="p-2 border rounded"
          >
            <option value="" disabled={newUser.role === "employee"}>
              No Manager
            </option>
            {users
              .filter((u) => u.role?.toLowerCase() === "manager")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <button
            onClick={handleCreateUser}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create User
          </button>
        </div>

        {/* Users Table */}
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Email</th>
                  <th className="px-4 py-2 border">Role</th>
                  <th className="px-4 py-2 border">Manager</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{u.name}</td>
                    <td className="px-4 py-2 border">{u.email}</td>
                    <td className="px-4 py-2 border">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="p-1 border rounded"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 border">{u.manager_name || "-"}</td>
                    <td className="px-4 py-2 border space-x-2">{/* optional actions */}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Expenses Section */}
      <section className="bg-white p-4 sm:p-6 rounded shadow space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold">All Expenses</h2>
        {loadingExpenses ? (
          <p>Loading expenses...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="bg-gray-50 p-4 rounded shadow flex flex-col justify-between">
                <div>
                  <p className="font-bold">{expense.title}</p>
                  <p>{expense.total_amount} {expense.currency}</p>
                  <p className="text-sm text-gray-500">Status: {expense.status}</p>

                  {/* Approval Instances */}
                  {expense.approvals?.length > 0 && (
                    <div className="text-sm mt-2">
                      <p className="font-medium">Approvals:</p>
                      {expense.approvals.map((a) => (
                        <p key={a.id} className="ml-2">
                          Approver: {a.approver_id} – Status: {a.status}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleOverrideApproval(expense.id, "Approved")}
                    className="flex-1 bg-green-600 text-white py-1 rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleOverrideApproval(expense.id, "Rejected")}
                    className="flex-1 bg-red-600 text-white py-1 rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
