function formatGhs(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) return "GH₵0.00";
  return `GH₵${value.toFixed(2)}`;
}

function formatPaymentMethod(method) {
  if (method === "paystack") return "Paystack (MoMo / Card)";
  if (method === "cod") return "Cash on Delivery";
  return method || "—";
}

function formatPaymentStatus(status) {
  if (status === "paid") return "Paid";
  if (status === "unpaid") return "Unpaid";
  if (status === "failed") return "Failed";
  return status || "—";
}
