export default function Stats() {
  return (
    <section className="py-20 text-center bg-blue-600 text-white">
      <div className="grid md:grid-cols-3 gap-8">
        <div>
          <h2 className="text-4xl font-bold">1000+</h2>
          <p>Produits gérés</p>
        </div>
        <div>
          <h2 className="text-4xl font-bold">500+</h2>
          <p>Utilisateurs</p>
        </div>
        <div>
          <h2 className="text-4xl font-bold">99%</h2>
          <p>Satisfaction</p>
        </div>
      </div>
    </section>
  );
}