export const orderStatusLabel: Record<string, string> = {
  enquiry: "Enquiry",
  unpaid: "Awaiting payment",
  paid_verified: "Paid",
  fulfilling: "Being prepared",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
export const isPaidStatus = (s: string) => ["paid_verified", "fulfilling", "completed"].includes(s);
export const fmtDate = (unix: number) => new Date(unix * 1000).toLocaleString();
