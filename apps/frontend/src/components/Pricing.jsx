export default function Pricing() {
  const plans = [
    { name: "Essentiel", price: "10€/mois" },
    { name: "Pro", price: "25€/mois" },
    { name: "Premium", price: "50€/mois" }
  ];

  return (
    <section className="py-20 text-center">
      <h2 className="text-3xl font-bold mb-10">Nos tarifs</h2>

      <div className="grid md:grid-cols-3 gap-8 px-10">
        {plans.map((plan, i) => (
          <div key={i} className="p-6 border rounded-xl hover:shadow-xl">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-2xl mt-4">{plan.price}</p>
          </div>
        ))}
      </div>
    </section>
  );
}