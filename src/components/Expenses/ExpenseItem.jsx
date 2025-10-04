import dayjs from "dayjs";

export default function ExpenseItem({ expense, role, onApprove }) {
  const isManager = role.toLowerCase() === "manager";

  // Safely extract pending approvers
  const pendingApprovers = Array.isArray(expense.pending_approvers) ? expense.pending_approvers : [];
  const canApprove = isManager && pendingApprovers.some(a => a.id === expense.current_approver_id);

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <div className="flex justify-between">
        <div>
          <h3 className="font-bold">{expense.title || "Untitled Expense"}</h3>
          <p className="text-sm text-gray-500">
            {expense.submitted_at ? dayjs(expense.submitted_at).format("DD MMM YYYY") : "Unknown date"}
          </p>
          {expense.description && <p>{expense.description}</p>}
        </div>

        <div className="text-right">
          <span className="font-bold">
            {expense.total_amount ?? 0} {expense.currency ?? "USD"}
          </span>
          <p className={`mt-1 ${
            expense.status === "Approved" ? "text-green-600" :
            expense.status === "Rejected" ? "text-red-600" : "text-yellow-600"
          }`}>
            {expense.status ?? "Pending"}
          </p>
        </div>
      </div>

      {Array.isArray(expense.items) && expense.items.length > 0 && (
        <div className="mt-2 border-t pt-2">
          {expense.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.description ?? "No description"}</span>
              <span>{item.amount ?? 0} {item.currency ?? expense.currency ?? "USD"}</span>
            </div>
          ))}
        </div>
      )}

      {expense.approval_rule && (
        <div className="mt-2 text-sm text-gray-500">
          <p>
            Approval Rule: {
              expense.approval_rule.type === "percentage"
                ? `${expense.approval_rule.threshold}% of approvers required`
                : expense.approval_rule.type === "specific"
                  ? `Approval required from ${expense.approval_rule.specific_approver}`
                  : `Hybrid rule (${expense.approval_rule.threshold}% or ${expense.approval_rule.specific_approver})`
            }
          </p>
        </div>
      )}

      {canApprove && (
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => onApprove(expense.id, "Approved")}
            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => onApprove(expense.id, "Rejected")}
            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      )}

      {pendingApprovers.length > 0 && (
        <div className="mt-2 text-sm text-gray-400">
          <p>Pending Approvers: {pendingApprovers.map(a => a.name ?? "Unknown").join(", ")}</p>
        </div>
      )}
    </div>
  );
}
