export const getCurrencyInfo = (devise?: string) => {
  const value = devise || "USD ($)";

  if (value.includes("CDF") || value.includes("FC")) {
    return { label: "CDF (FC)", symbol: "FC", code: "CDF" };
  }

  if (value.includes("EUR") || value.includes("€")) {
    return { label: "EUR (€)", symbol: "€", code: "EUR" };
  }

  return { label: "USD ($)", symbol: "$", code: "USD" };
};

export const getActiveBoutiqueCurrency = () => {
  if (typeof window === "undefined") return "USD ($)";

  try {
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
    return profile?.boutique?.deviseParDefaut || "USD ($)";
  } catch {
    return "USD ($)";
  }
};

export const formatMoney = (value: number | string | undefined | null, devise?: string) => {
  const amount = Number(value || 0);
  const { symbol } = getCurrencyInfo(devise);
  return `${amount.toLocaleString("fr-FR")} ${symbol}`;
};
