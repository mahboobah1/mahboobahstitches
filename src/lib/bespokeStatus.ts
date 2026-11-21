/** Words shown to the customer (friendly) and to staff (exact). */
export const customerStatus: Record<string, string> = {
  submitted: "Received", under_review: "Under review", awaiting_information: "We need a little more information",
  quotation_prepared: "We are preparing your quotation", awaiting_approval: "Your quotation is ready", approved: "Approved",
  in_production: "Being made", completed: "Completed", rejected: "We cannot make this one", cancelled: "Cancelled",
};
export const staffStatus: Record<string, string> = {
  submitted: "Submitted", under_review: "Under review", awaiting_information: "Awaiting information", quotation_prepared: "Quotation prepared",
  awaiting_approval: "Awaiting approval", approved: "Approved", in_production: "In production", completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};
export const FINAL_STATUSES = ["completed", "rejected", "cancelled"];
export const MEASURE_LABELS: Record<string, string> = { bust: "Bust", waist: "Waist", hips: "Hips", shoulder: "Shoulder width", sleeveLength: "Sleeve length", dressLength: "Dress length", height: "Height" };
