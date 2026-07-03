// src/components/PaymentScreen.tsx
"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { processPayment } from "../services/rideService";

interface PaymentScreenProps {
  amount: number;
  onSuccess: () => void;
  onFailure: () => void;
  onCancel: () => void;
}

export default function PaymentScreen({ amount, onSuccess, onFailure, onCancel }: PaymentScreenProps) {
  const [method, setMethod] = useState<"cash" | "stripe" | "wallet">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await processPayment(method, amount);
      if (res.success) {
        onSuccess();
      } else {
        setError("Payment failed");
        onFailure();
      }
    } catch (e) {
      setError("Payment error");
      onFailure();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white/90 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Payment</h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full">
          <X size={20} />
        </button>
      </div>
      <p className="mb-4">Amount due: <span className="font-bold">₹{amount.toFixed(2)}</span></p>
      <div className="flex flex-col gap-2 mb-4">
        {(["cash", "stripe", "wallet"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2">
            <input
              type="radio"
              name="payment"
              value={m}
              checked={method === m}
              onChange={() => setMethod(m)}
            />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </label>
        ))}
      </div>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <button
        onClick={pay}
        disabled={loading}
        className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
      >
        {loading ? "Processing…" : "Pay now"}
      </button>
    </div>
  );
}
