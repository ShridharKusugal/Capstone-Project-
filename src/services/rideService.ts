// src/services/rideService.ts

export const processPayment = async (
  method: "cash" | "stripe" | "wallet",
  amount: number
) => {
  // Simulated delay (1.5s)
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true, transactionId: `tx_${Date.now()}` };
};

export const submitRating = async (
  rideId: string,
  rating: number,
  review?: string
) => {
  // Simulated delay (0.5s)
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true };
};
