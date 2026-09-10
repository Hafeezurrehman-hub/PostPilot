"use client";

import { CATEGORIES } from "./ExpenseForm";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  created_at: string;
}

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (id: string) => void;
}

function getCategoryInfo(categoryId: string) {
  return (
    CATEGORIES.find((c) => c.id === categoryId) ?? {
      id: "other",
      label: "Other",
      emoji: "📌",
    }
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ExpenseItem({ expense, onDelete }: ExpenseItemProps) {
  const cat = getCategoryInfo(expense.category);

  return (
    <div className="group flex items-center gap-4 px-4 py-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-all">
      {/* Emoji */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xl">
        {cat.emoji}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">
            {cat.label}
          </span>
          {expense.description && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500 truncate">
                {expense.description}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-rose-400">
          - ₨{formatCurrency(expense.amount)}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(expense.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        title="Delete"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
