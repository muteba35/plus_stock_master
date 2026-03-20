export default function Features() {
  const items = [
    "Gestion des produits",
    "Caisse rapide",
    "Rapports intelligents",
    "Gestion équipe",
    "Sécurité avancée",
    "Mode offline"
  ];

  return (
    <section className="py-20 px-10 bg-gray-50">
      <h2 className="text-3xl font-bold text-center mb-10">
        Fonctionnalités principales
      </h2>

      <div className="grid md:grid-cols-3 gap-8">
        {items.map((item, i) => (
          <div 
            key={i}
            className="p-6 bg-white rounded-xl shadow hover:shadow-2xl transform hover:-translate-y-2 transition"
          >
            <h3 className="text-xl font-semibold">{item}</h3>
            <p className="text-gray-600 mt-2">
              Description rapide de la fonctionnalité.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}