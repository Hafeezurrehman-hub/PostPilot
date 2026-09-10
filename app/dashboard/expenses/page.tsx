"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import ExpenseForm, { type ExpenseFormData } from "@/components/ExpenseForm";
import ExpenseItem, { type Expense } from "@/components/ExpenseItem";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-orange-500",
  transport: "bg-blue-500",
  shopping: "bg-pink-500",
  bills: "bg-yellow-500",
  health: "bg-emerald-500",
  entertainment: "bg-purple-500",
  education: "bg-cyan-500",
  other: "bg-slate-500",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ExpensesPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const router = useRouter();
  const { toast } = useToast();

  const fetchExpenses = useCallback(
    async (userId: string, date?: string) => {
      const supabase = createClient();
      let query = supabase
        .from("daily_expenses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (date) {
        query = query.eq("expense_date", date);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching expenses:", error);
        return [];
      }
      return data as Expense[];
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email);
      const data = await fetchExpenses(user.id, selectedDate);
      setExpenses(data);
      setLoading(false);
    });
  }, [router, selectedDate, fetchExpenses]);

  const handleAddExpense = async (formData: ExpenseFormData) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setAdding(true);

    const { error } = await supabase.from("daily_expenses").insert({
      user_id: user.id,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description || null,
      expense_date: formData.expense_date,
    });

    setAdding(false);

    if (error) {
      toast("Failed to add expense. Try again.", "error");
      return;
    }

    toast("Expense added! ✓", "success");

    // Refetch expenses for the selected date
    if (formData.expense_date === selectedDate) {
      const data = await fetchExpenses(user.id, selectedDate);
      setExpenses(data);
    } else {
      setSelectedDate(formData.expense_date);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("daily_expenses").delete().eq("id", id);

    if (error) {
      toast("Failed to delete expense.", "error");
      return;
    }

    toast("Expense deleted.", "info");
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // --- Summary calculations ---
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryBreakdown = expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const categoryEntries = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxCatAmount = categoryEntries[0]?.[1] || 1;

  return (
    <main className="flex-1 bg-slate-950 text-slate-100 min-h-screen">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-semibold text-white">Daily Expenses</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track where your money goes
            </p>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split("T")[0]);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              ‹
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
            />
            <button
              onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() + 1);
                const today = new Date().toISOString().split("T")[0];
                const newDate = d.toISOString().split("T")[0];
                if (newDate <= today) setSelectedDate(newDate);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Total Spent */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/50 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {formatDateLabel(selectedDate)}
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              ₨{formatCurrency(totalAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded
            </p>
          </div>

          {/* Category Breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/50 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Top Categories
            </p>
            {categoryEntries.length === 0 ? (
              <p className="text-sm text-slate-600">No expenses yet</p>
            ) : (
              <div className="space-y-2.5">
                {categoryEntries.map(([cat, amount]) => {
                  const pct = (amount / maxCatAmount) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 capitalize">{cat}</span>
                        <span className="text-slate-300 font-medium">
                          ₨{formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[cat] || "bg-slate-500"} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Form + List side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Quick Add Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sticky top-24">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                  +
                </span>
                Quick Add
              </h2>
              <ExpenseForm
                onSubmit={handleAddExpense}
                loading={adding}
                defaultDate={selectedDate}
              />
            </div>
          </div>

          {/* Expense List */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-white mb-4">
              Expenses
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-slate-800/30 animate-pulse"
                  />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 py-16 text-center">
                <p className="text-4xl mb-3">💸</p>
                <p className="text-sm text-slate-400">No expenses for this day</p>
                <p className="text-xs text-slate-600 mt-1">
                  Add your first expense using the form
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
