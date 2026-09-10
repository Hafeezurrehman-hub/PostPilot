"use client";

import { useState } from "react";

export interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  expense_date: string;
}

const CATEGORIES = [
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "transport", label: "Transport", emoji: "🚗" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "bills", label: "Bills", emoji: "📄" },
  { id: "health", label: "Health", emoji: "💊" },
  { id: "entertainment", label: "Fun", emoji: "🎮" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "other", label: "Other", emoji: "📌" },
];

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  loading: boolean;
  defaultDate?: string;
}

export default function ExpenseForm({
  onSubmit,
  loading,
  defaultDate,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    defaultDate || new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    await onSubmit({
      amount,
      category,
      description,
      expense_date: expenseDate,
    });
    setAmount("");
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount Input — large and prominent */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-medium">
            ₨
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 pl-10 pr-4 py-4 text-2xl font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Category Selection — emoji grid */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Category
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-all ${
                category === cat.id
                  ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10"
                  : "border-2 border-transparent bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              <span className="text-xl">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Note (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Lunch with friends"
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Date
        </label>
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all [color-scheme:dark]"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !amount || parseFloat(amount) <= 0}
        className="w-full rounded-xl bg-indigo-500 px-6 py-4 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving…
          </span>
        ) : (
          "+ Add Expense"
        )}
      </button>
    </form>
  );
}

export { CATEGORIES };
