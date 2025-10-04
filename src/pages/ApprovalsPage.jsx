import { useEffect, useState, useContext } from "react";
import api from "../api/api.js";
import dayjs from "dayjs";
import { UserContext } from "../context/UserContext.jsx";

function ApprovalItem({ expense, comment, onCommentChange, onApprove }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold">{expense.title}</h3>
          <p className="text-sm text-gray-500">
            Submitted on {dayjs(expense.submitted_at).format("DD MMM YYYY")}
          </p>
          <p>{expense.description}</p>
          <p className="mt-1 font-bold">
            {expense.total_amount} {expense.currency}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Approval Step: {expense.current_step} / {expense.total_steps} <br />
            Rule: {expense.approval_rule.type === "percentage"
              ? `${expense.approval_rule.value}% required`
              : expense.approval_rule.type === "specific"
              ? `Requires ${expense.approval_rule.approver_name}`
              : "Hybrid rule"}
          </p>
        </div>

        <div className="flex flex-col space-y-2 ml-4 w-64">
          <textarea
            placeholder="Add comment..."
            value={comment || ""}
            onChange={(e) => onCommentChange(expense.id, e.target.value)}
            className="border p-2 rounded w-full"
          />
          <div className="flex space-x-2">
            <button
              onClick={() => onApprove(expense.id, "Approved")}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => onApprove(expense.id, "Rejected")}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      </div>

      {expense.approvals && expense.approvals.length > 0 && (
        <div className="mt-4 border-t pt-2 text-sm text-gray-700">
          <p className="font-medium">Approval History:</p>
          {expense.approvals.map((a) => (
            <p key={a.id}>
              {a.approver_name} - {a.status} ({dayjs(a.date).format("DD MMM YYYY")}) - {a.comment || "No comment"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const { user } = useContext(UserContext); // get logged-in user
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState({});

  const fetchPendingExpenses = async () => {
    setLoading(true);
    try {
      // Fetch only relevant expenses for this user
      const endpoint = user?.role === "Manager" 
        ? "/approvals/pending" 
        : "/approvals/my-approvals"; // optional backend endpoint for employee
      const res = await api.get(endpoint);
      setPendingExpenses(res.data);
    } catch (err) {
      console.error("Failed to fetch pending expenses:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPendingExpenses();
  }, [user]);

  const handleCommentChange = (expenseId, value) => {
    setComments((prev) => ({ ...prev, [expenseId]: value }));
  };

  const handleApproval = async (expenseId, action) => {
    try {
      await api.post(`/approvals/${expenseId}`, {
        action,
        comment: comments[expenseId] || "",
      });
      setComments((prev) => ({ ...prev, [expenseId]: "" }));
      fetchPendingExpenses();
    } catch (err) {
      console.error("Failed to approve/reject expense:", err);
    }
  };

  if (loading) return <p className="text-center mt-6">Loading...</p>;
  if (!user) return <p className="text-center mt-6">Please login to see approvals.</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pending Approvals</h1>
      {pendingExpenses.length === 0 && <p>No pending expenses</p>}
      {pendingExpenses.map((expense) => (
        <ApprovalItem
          key={expense.id}
          expense={expense}
          comment={comments[expense.id]}
          onCommentChange={handleCommentChange}
          onApprove={handleApproval}
        />
      ))}
    </div>
  );
}
