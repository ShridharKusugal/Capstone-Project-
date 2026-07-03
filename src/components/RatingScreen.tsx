// src/components/RatingScreen.tsx
"use client";

import React, { useState } from "react";
import { X, Star } from "lucide-react";
import { submitRating } from "../services/rideService";

interface RatingScreenProps {
  rideId: string;
  onFinish: (rating: number, review: string) => void;
  onCancel: () => void;
}

export default function RatingScreen({ rideId, onFinish, onCancel }: RatingScreenProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState(" ");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    await submitRating(rideId, rating, review.trim() || undefined);
    setLoading(false);
    onFinish(rating, review.trim());
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white/90 backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Rate your ride</h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full">
          <X size={20} />
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={32}
            fill={i <= rating ? "#ffb400" : "none"}
            stroke={i <= rating ? "#ffb400" : "#ccc"}
            onClick={() => setRating(i)}
            className="cursor-pointer"
          />
        ))}
      </div>
      <textarea
        placeholder="Leave a comment (optional)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        className="border rounded p-2 mb-4"
        rows={3}
      />
      <button
        onClick={submit}
        disabled={loading || rating === 0}
        className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
      >
        {loading ? "Submitting…" : "Submit rating"}
      </button>
    </div>
  );
}
