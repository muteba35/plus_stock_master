export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10 px-10">
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <h2 className="font-bold text-xl">PlusStock</h2>
          <p className="text-gray-400">Solution de gestion moderne</p>
        </div>

        <div>
          <p>Fonctionnalités</p>
          <p>Tarifs</p>
          <p>Contact</p>
        </div>

        <div>
          <p>Email : contact@plusstock.com</p>
        </div>
      </div>
    </footer>
  );
}