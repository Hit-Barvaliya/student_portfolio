import React from "react";

export default function TaskAnalyticsChart({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const lowPriority = tasks.filter((t) => (t.priority || "").toLowerCase() === "low").length;
  const normalPriority = tasks.filter((t) => (t.priority || "").toLowerCase() === "normal" || (t.priority || "").toLowerCase() === "medium").length;
  const highPriority = tasks.filter((t) => (t.priority || "").toLowerCase() === "high").length;

  return (
    <div className="task-analytics-card" style={{
      background: "var(--card-bg, #ffffff)",
      border: "1px solid var(--border-color, #e2e8f0)",
      borderRadius: "12px",
      padding: "20px",
      margin: "20px 0",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
    }}>
      <h3 style={{ margin: "0 0 14px 0", fontSize: "1.1rem" }}>📊 Task Analytics & Distribution</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#3b82f6" }}>{total}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Total Tasks</div>
        </div>
        <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#10b981" }}>{completed}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Completed</div>
        </div>
        <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#f59e0b" }}>{pending}</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Pending</div>
        </div>
        <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#8b5cf6" }}>{completionRate}%</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Progress</div>
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
          <span>Completion Progress</span>
          <span>{completionRate}%</span>
        </div>
        <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${completionRate}%`,
            background: "linear-gradient(90deg, #10b981, #059669)",
            transition: "width 0.4s ease"
          }} />
        </div>
      </div>

      <div style={{ fontSize: "0.85rem", marginTop: "14px" }}>
        <span style={{ color: "#64748b" }}>Priority Breakdown: </span>
        <span style={{ color: "#10b981", fontWeight: 600, marginRight: "12px" }}>Low: {lowPriority}</span>
        <span style={{ color: "#3b82f6", fontWeight: 600, marginRight: "12px" }}>Normal: {normalPriority}</span>
        <span style={{ color: "#ef4444", fontWeight: 600 }}>High: {highPriority}</span>
      </div>
    </div>
  );
}
